import { describe, expect, it } from 'vitest';
import { loadProfiles } from '../../src/config/profiles';
import { FIXED_DT } from '../../src/core/fixedStep';
import { Crane, type CraneCommands, NO_COMMANDS } from '../../src/crane/crane';
import type { CraneEvent } from '../../src/crane/events';
import { allLanded } from '../../src/crane/landing';
import { boxDims } from '../../src/sim/container';
import { World } from '../../src/sim/world';

function setup() {
  const { profiles, scene } = loadProfiles();
  const world = new World(scene, profiles);
  return { crane: new Crane(profiles, world), world, profiles };
}

const events: CraneEvent[] = [];
function run(crane: Crane, cmd: Partial<CraneCommands>, seconds: number, until?: () => boolean): void {
  for (let t = 0; t < seconds; t += FIXED_DT) {
    crane.step(FIXED_DT, { ...NO_COMMANDS, ...cmd });
    events.push(...crane.events.splice(0));
    if (until?.()) return;
  }
}

/**
 * One smooth trolley move with an analogue lever: speed ramps up over one sway period and down over one
 * period, so the load arrives without swinging (the operator's technique; anti-sway catches the rest).
 */
function shapedMove(crane: Crane, distance: number): void {
  const period = 2 * Math.PI * Math.sqrt(crane.ropeFall / 9.81);
  const vMax = crane.trolley.axis.params.maxSpeed;
  const v = Math.min(vMax, Math.abs(distance) / period);
  const cruise = Math.abs(distance) / v - period;
  const total = 2 * period + cruise;
  for (let t = 0; t < total; t += FIXED_DT) {
    const speed = t < period ? (v * t) / period : t < period + cruise ? v : (v * (total - t)) / period;
    run(crane, { trolley: (Math.sign(distance) * speed) / vMax }, FIXED_DT);
  }
}

/** The swing has died out and the trolley stands. */
const settled = (crane: Crane): boolean =>
  Math.abs(crane.sway.offsets(crane.ropeFall).trolley) < 0.005 &&
  Math.abs(crane.sway.trolley.rate * crane.ropeFall) < 0.005 &&
  Math.abs(crane.trolley.axis.velocity) < 0.002;

/** Brings the hanging load over `target` (fromWatersideRail_m): smooth moves, then settle and correct. */
function loadTo(crane: Crane, target: number): void {
  for (let i = 0; i < 10; i++) {
    const error = target - crane.load.pose.fwr;
    if (Math.abs(error) < 0.02 && settled(crane)) return;
    shapedMove(crane, error);
    run(crane, {}, 30, () => settled(crane));
  }
  throw new Error(`load did not settle over ${target}`);
}

/** Lowers at full speed to 7 m above `height` (the ramp to creep takes 5.9 m), then creeps until landed. */
function lowerOnto(crane: Crane, height: number): void {
  run(crane, { hoist: -1 }, 60, () => crane.hoist.height < height + 7);
  run(crane, { hoist: -1, creep: true }, 60, () => allLanded(crane.landing));
}

describe('pick and place: 14-02-88 to the chassis in L1', () => {
  it('lands, locks, lifts, lands on the chassis, unlocks, and the tractor takes the box away', () => {
    const { crane, world, profiles } = setup();
    events.length = 0;
    const box = world.containers.find((b) => b.location.kind === 'vessel' && b.location.slot === '14-02-88');
    expect(box).toBeDefined();
    if (!box) return;

    // Over the box: anti-sway on, flippers down, the hanging load over the row, the swing settled.
    run(crane, { toggleAntiSway: true, toggleFlippers: true }, FIXED_DT);
    loadTo(crane, world.frame.fromWatersideRail(box.z));
    const height = boxDims(box, profiles.containers).height;
    lowerOnto(crane, box.y + height);
    expect(allLanded(crane.landing)).toBe(true);
    const touch = events.find((e) => e.kind === 'landed');
    expect(touch?.kind === 'landed' && touch.hard).toBe(false);

    // Lock (0.6 s), flippers up, lift clear of the stack.
    run(crane, { toggleLock: true, toggleFlippers: true }, FIXED_DT);
    run(crane, {}, 1);
    expect(crane.spreader.twistlocks.state).toBe('locked');
    expect(crane.carried?.box.id).toBe(box.id);
    expect(crane.hoist.load_t).toBe(box.grossWeight_t);
    run(crane, { hoist: 1 }, 20, () => crane.hoist.height > 22);

    // Unlock refused while hanging.
    run(crane, { toggleLock: true }, FIXED_DT);
    expect(events.some((e) => e.kind === 'refused' && e.action === 'unlock')).toBe(true);
    expect(crane.spreader.twistlocks.state).toBe('locked');

    // To the lane, lower onto the chassis bed, unlock.
    loadTo(crane, world.scene.lane.fromWatersideRail_m);
    lowerOnto(crane, world.chassis.bedTop + height);
    expect(allLanded(crane.landing)).toBe(true);
    expect(box.y).toBeCloseTo(world.chassis.bedTop, 6);
    run(crane, { toggleLock: true }, FIXED_DT);
    run(crane, {}, 1);
    expect(crane.spreader.twistlocks.state).toBe('open');
    expect(crane.carried).toBeNull();
    expect(box.location).toEqual({ kind: 'chassis', position: 'centre' });
    const placed = events.find((e) => e.kind === 'placed');
    expect(placed?.kind === 'placed' && placed.label).toBe('L1 centre');
    if (placed?.kind === 'placed') {
      expect(Math.abs(placed.dx_cm)).toBeLessThan(5);
      expect(Math.abs(placed.dz_cm)).toBeLessThan(5);
    }

    // Lift off the box; 5 s after the unlock the tractor leaves with it.
    run(crane, { hoist: 1 }, 6);
    expect(world.container(box.id)).toBeUndefined();
    expect(events.some((e) => e.kind === 'cleared' && e.boxId === box.id)).toBe(true);
  });
});

describe('spreader interlocks', () => {
  it('refuses to lock while not landed and to telescope while landed', () => {
    const { crane } = setup();
    events.length = 0;
    run(crane, { toggleLock: true }, FIXED_DT);
    expect(events).toContainEqual({ kind: 'refused', action: 'lock', reason: 'NOT LANDED' });
    lowerOnto(crane, 0);
    run(crane, { spreaderSize: 20 }, FIXED_DT);
    expect(events).toContainEqual({ kind: 'refused', action: 'telescope', reason: 'LANDED OR LOCKED' });
    run(crane, { toggleLock: true }, FIXED_DT);
    expect(events).toContainEqual({ kind: 'refused', action: 'lock', reason: 'NOT ON ONE BOX' });
  });

  it('telescopes 40 to 20 ft in about 15 s at 0.2 m/s per end', () => {
    const { crane } = setup();
    run(crane, { spreaderSize: 20 }, FIXED_DT);
    run(crane, {}, 15.4, () => crane.spreaderSize === 20);
    expect(crane.spreaderSize).toBe(20);
    expect(crane.spreader.telescope.length).toBeCloseTo(5.853, 6);
  });

  it('sounds the hard-landing alarm above 0.5 m/s and stops lowering on the slack-rope ramp', () => {
    const { crane } = setup();
    events.length = 0;
    run(crane, { hoist: -1 }, 30, () => crane.landing.landed.WL);
    const touch = events.find((e) => e.kind === 'landed');
    expect(touch?.kind === 'landed' && touch.hard).toBe(true);
    expect(crane.load.pose.y).toBe(0);
    run(crane, { hoist: -1 }, 5);
    expect(crane.hoist.axis.velocity).toBe(0);
    expect(crane.load.pose.y).toBe(0);
    // Hoisting takes up the slack first, then the spreader lifts.
    run(crane, { hoist: 1 }, 10, () => !crane.landing.landed.WL);
    expect(crane.load.pose.y).toBeGreaterThan(0);
  });
});

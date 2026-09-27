import { describe, expect, it } from 'vitest';
import { loadProfiles } from '../../src/config/profiles';
import { FIXED_DT } from '../../src/core/fixedStep';
import type { RampedAxis } from '../../src/core/rampedAxis';
import { Crane, type CraneCommands, NO_COMMANDS } from '../../src/crane/crane';
import { World } from '../../src/sim/world';

function makeCrane(): Crane {
  const { profiles, scene } = loadProfiles();
  return new Crane(profiles, scene, new World(scene, profiles).frame);
}

interface Run {
  min: number;
  max: number;
  /** Highest speed seen within 0.5 m of the stop being approached. */
  arrivalSpeed: number;
}

/** Holds one command for a time and records the axis extremes and its speed on arrival. */
function hold(crane: Crane, axis: RampedAxis, cmd: Partial<CraneCommands>, seconds: number): Run {
  const run: Run = { min: axis.position, max: axis.position, arrivalSpeed: 0 };
  for (let t = 0; t < seconds; t += FIXED_DT) {
    crane.step(FIXED_DT, { ...NO_COMMANDS, ...cmd });
    run.min = Math.min(run.min, axis.position);
    run.max = Math.max(run.max, axis.position);
    const ahead = axis.velocity > 0 ? axis.travel.max - axis.position : axis.position - axis.travel.min;
    if (ahead < 0.5) run.arrivalSpeed = Math.max(run.arrivalSpeed, Math.abs(axis.velocity));
  }
  return run;
}

describe('Crane drives (scripted run into every limit)', () => {
  it('gantry reaches both rail-end limits (13.5 / 286.5) at crawl speed without overrun', () => {
    const crane = makeCrane();
    const a = crane.gantry.axis;
    expect(a.travel).toEqual({ min: 13.5, max: 286.5 });
    const right = hold(crane, a, { gantry: 1 }, 200);
    expect(right.max).toBeLessThanOrEqual(286.5);
    expect(a.position).toBeCloseTo(286.5, 6);
    expect(right.arrivalSpeed).toBeLessThanOrEqual(0.15 + 1e-9);
    const left = hold(crane, a, { gantry: -1 }, 420);
    expect(left.min).toBeGreaterThanOrEqual(13.5);
    expect(a.position).toBeCloseTo(13.5, 6);
    expect(left.arrivalSpeed).toBeLessThanOrEqual(0.15 + 1e-9);
  });

  it('trolley reaches outreach +65.0 and backreach −50.48 without overrun', () => {
    const crane = makeCrane();
    const a = crane.trolley.axis;
    const out = hold(crane, a, { trolley: 1 }, 60);
    expect(out.max).toBeLessThanOrEqual(65);
    expect(a.position).toBeCloseTo(65, 6);
    expect(out.arrivalSpeed).toBeLessThanOrEqual(0.8 + 1e-9);
    const back = hold(crane, a, { trolley: -1 }, 60);
    expect(a.travel.min).toBeCloseTo(-50.48, 9);
    expect(back.min).toBeGreaterThanOrEqual(a.travel.min);
    expect(a.position).toBe(a.travel.min);
    expect(back.arrivalSpeed).toBeLessThanOrEqual(0.8 + 1e-9);
  });

  it('hoist reaches +48.0 through the upper pre-limit zone and the lower limit −20.0', () => {
    const crane = makeCrane();
    const a = crane.hoist.axis;
    const up = hold(crane, a, { hoist: 1 }, 30);
    expect(up.max).toBeLessThanOrEqual(48);
    expect(a.position).toBeCloseTo(48, 6);
    expect(up.arrivalSpeed).toBeLessThanOrEqual(0.6 + 1e-9);
    expect(crane.hoist.atTop).toBe(true);
    const down = hold(crane, a, { hoist: -1 }, 60);
    expect(down.min).toBeGreaterThanOrEqual(-20);
    expect(a.position).toBeCloseTo(-20, 6);
  });

  it('creep holds 10 % of the maximum speed on every drive', () => {
    const crane = makeCrane();
    hold(crane, crane.gantry.axis, { gantry: 1, trolley: 1, hoist: -1, creep: true }, 3);
    expect(crane.gantry.axis.velocity).toBeCloseTo(0.075, 6);
    expect(crane.trolley.axis.velocity).toBeCloseTo(0.4, 6);
    expect(crane.hoist.axis.velocity).toBeCloseTo(-0.3, 6);
  });

  it('hoist speed follows the load (constant power)', () => {
    const crane = makeCrane();
    crane.hoist.load_t = 40;
    hold(crane, crane.hoist.axis, { hoist: -1 }, 5);
    expect(crane.hoist.axis.velocity * 60).toBeCloseTo(-131, 0);
  });
});

describe('Boom interlocks', () => {
  it('refuses to move unless the trolley is parked, the hoist is at the top and the gantry stands', () => {
    const crane = makeCrane();
    hold(crane, crane.boom.axis, { boom: 1 }, 1);
    expect(crane.boom.interlock).toBe('HOIST TO TOP');
    expect(crane.boom.axis.position).toBe(0);

    hold(crane, crane.trolley.axis, { trolley: 1 }, 10);
    hold(crane, crane.hoist.axis, { hoist: 1 }, 30);
    hold(crane, crane.boom.axis, { boom: 1 }, 1);
    expect(crane.boom.interlock).toBe('PARK TROLLEY');
    expect(crane.boom.axis.position).toBe(0);

    hold(crane, crane.trolley.axis, { trolley: -1 }, 20);
    hold(crane, crane.boom.axis, { boom: 1, gantry: 1 }, 1);
    expect(crane.boom.interlock).toBe('STOP GANTRY');
  });

  it('raises in 150 s, latches, keeps the trolley landside, and lowers after the latch releases', () => {
    const crane = makeCrane();
    hold(crane, crane.hoist.axis, { hoist: 1 }, 30);
    hold(crane, crane.trolley.axis, { trolley: -1 }, 5);
    const up = hold(crane, crane.boom.axis, { boom: 1 }, 149);
    expect(crane.boom.axis.position).toBeLessThan(80);
    hold(crane, crane.boom.axis, { boom: 1 }, 1.5);
    expect(up.max).toBeLessThanOrEqual(80);
    expect(crane.boom.axis.position).toBeCloseTo(80, 6);
    expect(crane.boom.latched).toBe(false);
    hold(crane, crane.boom.axis, {}, 10.5);
    expect(crane.boom.latched).toBe(true);

    // Boom up: the trolley stops at the park position (boom-hinge limit).
    const t = hold(crane, crane.trolley.axis, { trolley: 1 }, 30);
    expect(t.max).toBeLessThanOrEqual(-6);
    expect(crane.trolley.axis.position).toBeCloseTo(-6, 6);

    // Lowering first releases the latch (10 s), then the boom comes down.
    hold(crane, crane.boom.axis, { boom: -1 }, 9.5);
    expect(crane.boom.axis.position).toBe(80);
    hold(crane, crane.boom.axis, { boom: -1 }, 155);
    expect(crane.boom.axis.position).toBe(0);
    expect(crane.boom.down).toBe(true);
    hold(crane, crane.trolley.axis, { trolley: 1 }, 30);
    expect(crane.trolley.axis.position).toBeGreaterThan(20);
  });
});

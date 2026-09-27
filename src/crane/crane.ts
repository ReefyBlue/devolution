// The STS crane in its fixed per-step order (proposal §5.3), and the view the renderer and HUD read.

import type { Profiles } from '../config/profiles';
import { degToRad, GRAVITY, tonnesToKg } from '../core/units';
import { WindField } from '../core/wind';
import { boxDims, type Container, type SizeFt } from '../sim/container';
import { CORNERS, type CraneView } from '../sim/craneView';
import type { World } from '../sim/world';
import { Boom } from './boom';
import type { CraneEvent } from './events';
import { guideByFlippers } from './flipperGuide';
import { Gantry } from './gantry';
import { Hoist } from './hoist';
import { allLanded, anyLanded, type Landing, senseCorners } from './landing';
import { LoadSuspension, type Pivot } from './loadSuspension';
import { registerPlacement } from './placement';
import { Spreader } from './spreader';
import { SwayModel } from './swayModel';
import type { SizeRequest } from './telescope';
import { Trolley } from './trolley';
import { type ProjectedAreas, windForce } from './windLoad';

/** Operator commands for one fixed step (keyboard and gamepad already combined, presses taken). */
export interface CraneCommands {
  /** −1 … +1: + = world +X. */
  gantry: number;
  /** −1 … +1: + = towards the water. */
  trolley: number;
  /** −1 … +1: + = raise. */
  hoist: number;
  /** −1 … +1: + = raise the boom (hold-to-run). */
  boom: number;
  creep: boolean;
  toggleAntiSway: boolean;
  toggleLock: boolean;
  toggleFlippers: boolean;
  spreaderSize: SizeRequest | null;
}

export const NO_COMMANDS: CraneCommands = {
  gantry: 0,
  trolley: 0,
  hoist: 0,
  boom: 0,
  creep: false,
  toggleAntiSway: false,
  toggleLock: false,
  toggleFlippers: false,
  spreaderSize: null,
};

export class Crane {
  readonly gantry: Gantry;
  readonly trolley: Trolley;
  readonly hoist: Hoist;
  readonly boom: Boom;
  readonly sway: SwayModel;
  readonly wind: WindField;
  readonly spreader: Spreader;
  readonly load: LoadSuspension;
  /** Anti-sway switched on by the operator (off at start). */
  antiSway = false;
  /** The box locked under the spreader and its offset from the load point (x, fwr), or null. */
  carried: { box: Container; dx: number; dfwr: number } | null = null;
  landing: Landing;
  /** Events since the owner last took them. */
  events: CraneEvent[] = [];
  /** Simulation time, s. */
  time = 0;

  constructor(
    private readonly profiles: Profiles,
    private readonly world: World,
  ) {
    const scene = world.scene;
    const start = scene.crane;
    this.gantry = new Gantry(profiles, scene.quay.length_m, world.frame.worldX(start.startQuayMark_m));
    this.trolley = new Trolley(profiles, start.startTrolley_m);
    this.hoist = new Hoist(profiles, start.startHoistHeight_m);
    this.boom = new Boom(profiles);
    this.sway = new SwayModel(this.swayLimits());
    this.wind = new WindField(scene.wind, world.frame);
    this.spreader = new Spreader(profiles);
    this.load = new LoadSuspension({ x: this.gantry.x, fwr: this.trolley.fwr, y: this.hoist.height });
    this.landing = this.sense(this.load.pose);
  }

  step(dt: number, cmd: CraneCommands): void {
    const s = this.profiles.sway;
    const sp = this.spreader;
    this.time += dt;

    // 1. Operator presses.
    if (cmd.toggleAntiSway) this.antiSway = !this.antiSway;
    if (cmd.toggleFlippers) sp.flippers.toggle();
    if (cmd.spreaderSize) {
      if (this.telescopeBlocked) this.events.push({ kind: 'refused', action: 'telescope', reason: 'LANDED OR LOCKED' });
      else sp.telescope.select(cmd.spreaderSize);
    }

    // 2. Electronic anti-sway: the drives chase the load's swing, k × its offset from where the wind alone
    //    would hold it, on the speed reference (a = k·ℓ·θ̇). A steady wind offset is left alone.
    this.wind.step(dt);
    const force = windForce(this.wind.components(), this.windAreas, s.dragCoefficient);
    const weight = tonnesToKg(this.suspendedMass_t) * GRAVITY;
    const electronic = this.antiSway && s.antiSwayType !== 'rope';
    const ropeDamper = this.antiSway && s.antiSwayType !== 'electronic';
    const hanging = this.ropeFall;
    const offset = this.sway.offsets(hanging);
    const windHold = (f: number): number => (hanging * f) / Math.hypot(f, weight);
    const k = electronic ? s.electronicGain : 0;

    // 3. Drives.
    this.boom.step(dt, cmd.boom, { trolleyParked: this.trolley.parked, hoistAtTop: this.hoist.atTop, gantryStopped: !this.gantry.travelling });
    this.gantry.step(dt, cmd.gantry, cmd.creep, k * (offset.gantry - windHold(force.gantry)));
    this.trolley.step(dt, cmd.trolley, cmd.creep, this.boom.down, k * (offset.trolley - windHold(force.trolley)));
    this.hoist.step(dt, cmd.hoist, cmd.creep, anyLanded(this.landing), sp.twistlocks.turning);

    // 4. Pendulum, driven by the drives and the wind.
    const mass = weight / GRAVITY;
    this.sway.step(dt, {
      length: hanging,
      lengthRate: -this.hoist.axis.velocity,
      pivotAccelTrolley: this.trolley.axis.acceleration,
      pivotAccelGantry: this.gantry.axis.acceleration,
      windAccelTrolley: force.trolley / mass,
      windAccelGantry: force.gantry / mass,
      damping: s.naturalDamping + (ropeDamper ? s.ropeDamping : 0),
    });

    // 5. Candidate pose; flippers funnel an empty spreader onto a box.
    const pivot: Pivot = { x: this.gantry.x, fwr: this.trolley.fwr, vx: this.gantry.axis.velocity, vfwr: this.trolley.axis.velocity };
    const ropeFall = this.ropeFall;
    const cand = this.load.candidate(this.sway, pivot, this.hoist.height, ropeFall);
    if (!this.load.rest && !this.carried && sp.flippers.fullyDown) {
      guideByFlippers(cand, this.world, this.profiles, sp.telescope.length, this.sway, pivot, ropeFall);
    }

    // 6–8. Landing pins from the candidate pose, clamp, then move.
    this.landing = this.sense(cand, this.load.pose.y);
    const clampedY = this.landing.y + this.carriedHeight;
    const contactSpeed = this.load.settle(cand, clampedY, anyLanded(this.landing), this.sway, pivot, ropeFall, dt);
    if (contactSpeed !== null) {
      this.events.push({ kind: 'landed', speed: contactSpeed, hard: contactSpeed > this.profiles.rules.hardLanding_mps });
    }

    // 9. Twistlocks, telescope, flippers; the grip carries the box. A turn needs all four corners landed
    //    throughout; if the spreader lifts off, the locks go back.
    if (sp.twistlocks.turning && !allLanded(this.landing)) {
      const action = sp.twistlocks.state === 'locking' ? 'lock' : 'unlock';
      sp.twistlocks.abort();
      this.events.push({ kind: 'refused', action, reason: 'LIFTED WHILE TURNING' });
    }
    if (cmd.toggleLock && !sp.twistlocks.turning) this.requestLock();
    const turned = sp.twistlocks.step(dt);
    if (turned === 'locked') this.grip();
    if (turned === 'open') this.release();
    sp.telescope.step(dt, this.telescopeBlocked);
    sp.flippers.step(dt);
    this.moveCarriedBox();
    this.clearChassis();
  }

  /** Picks up values changed in the tuning panel; everything else reads the profiles every step. */
  retune(): void {
    this.gantry.retune();
    this.trolley.retune();
    this.hoist.retune();
    this.boom.retune();
    this.sway.limits = this.swayLimits();
  }

  private swayLimits() {
    const s = this.profiles.sway;
    return { substeps: s.substeps, minLength: s.minRopeFall_m, maxAngle: degToRad(s.maxAngle_deg) };
  }

  /** Rope fall from the trolley sheave axis to the headblock sheave axis, m. */
  get ropeFall(): number {
    const sp = this.profiles.spreader;
    return this.profiles.crane.sheaveHeight_m - this.hoist.height - sp.headblockHeight_m - sp.spreaderHeight_m;
  }

  /** Headblock + spreader + a locked box, t. */
  get suspendedMass_t(): number {
    const sp = this.profiles.spreader;
    return sp.headblockMass_t + sp.spreaderMass_t + this.hoist.load_t;
  }

  /** Faces the wind meets: the locked box, or the bare spreader. */
  get windAreas(): ProjectedAreas {
    if (this.carried) {
      const d = boxDims(this.carried.box, this.profiles.containers);
      return { side: d.length * d.height, end: d.width * d.height };
    }
    return { side: this.profiles.sway.spreaderAreaSide_m2, end: this.profiles.sway.spreaderAreaEnd_m2 };
  }

  view(): CraneView {
    const pose = this.load.pose;
    const z = this.world.frame.worldZ(pose.fwr);
    const box = this.carried?.box;
    return {
      gantryX: this.gantry.x,
      trolleyZ: this.world.frame.worldZ(this.trolley.fwr),
      boomAngle: this.boom.angleRad,
      load: { x: pose.x, y: pose.y, z },
      castingLength: this.spreader.telescope.length,
      flippersDown: this.spreader.flippers.position,
      cornerLanded: { ...this.landing.landed },
      locked: this.spreader.twistlocks.state === 'locked',
      carried: box ? { id: box.id, offset: { x: box.x - pose.x, y: box.y - pose.y, z: box.z - z } } : null,
    };
  }

  /** Size the telescope is at, or null while it moves. */
  get spreaderSize(): SizeFt | null {
    return this.spreader.telescope.moving ? null : this.spreader.telescope.size;
  }

  private get telescopeBlocked(): boolean {
    return this.spreader.twistlocks.state !== 'open' || anyLanded(this.landing);
  }

  private get carriedHeight(): number {
    return this.carried ? boxDims(this.carried.box, this.profiles.containers).height : 0;
  }

  /**
   * Landing pins from a pose: the twistlock plane, or the bottom castings of a carried box. `fromY` is the
   * height the load came down from this step, so a fast descent cannot pass through a surface.
   */
  private sense(pose: { x: number; fwr: number; y: number }, fromY = pose.y): Landing {
    const frame = this.world.frame;
    const c = this.carried;
    const cp = this.profiles.containers;
    return senseCorners(this.world, this.profiles, {
      x: pose.x + (c?.dx ?? 0),
      z: frame.worldZ(pose.fwr + (c?.dfwr ?? 0)),
      y: pose.y - this.carriedHeight,
      fromY: fromY - this.carriedHeight,
      castingLength: c ? boxDims(c.box, cp).castingLength : this.spreader.telescope.length,
      castingWidth: cp.castingSpacingWidth_m,
      carrying: c !== null,
      ignore: new Set(c ? [c.box.id] : []),
    });
  }

  private requestLock(): void {
    const locks = this.spreader.twistlocks;
    if (locks.state === 'locked') {
      if (allLanded(this.landing)) locks.start();
      else this.events.push({ kind: 'refused', action: 'unlock', reason: 'NOT LANDED' });
      return;
    }
    const pose = this.load.pose;
    const target = this.spreader.lockTarget(this.landing, this.world, { x: pose.x, z: this.world.frame.worldZ(pose.fwr) });
    if (typeof target === 'string') this.events.push({ kind: 'refused', action: 'lock', reason: target });
    else locks.start();
  }

  /** Locked: the box under all four corners goes on the ropes. */
  private grip(): void {
    const id = this.landing.surfaces.WL?.containerId;
    const box = id ? this.world.container(id) : undefined;
    if (!box) {
      this.spreader.twistlocks.state = 'open';
      this.events.push({ kind: 'refused', action: 'lock', reason: 'NO BOX UNDER THE SPREADER' });
      return;
    }
    const pose = this.load.pose;
    this.carried = { box, dx: box.x - pose.x, dfwr: this.world.frame.fromWatersideRail(box.z) - pose.fwr };
    box.location = { kind: 'spreader' };
    this.hoist.load_t = box.grossWeight_t;
    const ch = this.world.chassis;
    const onChassis = ch.load.indexOf(box.id);
    if (onChassis >= 0) {
      ch.load.splice(onChassis, 1);
      if (ch.load.length === 0) ch.departAt = null;
    }
    this.landing = this.sense(pose);
    this.events.push({ kind: 'twistlocks', locked: true });
  }

  /** Unlocked: the box stays exactly where it is and is registered to what is under it. */
  private release(): void {
    const c = this.carried;
    this.events.push({ kind: 'twistlocks', locked: false });
    if (!c) return;
    const support = CORNERS.map((k) => this.landing.surfaces[k]).find((s) => s !== null);
    this.carried = null;
    this.hoist.load_t = 0;
    const placement = support ? registerPlacement(c.box, support, this.world) : null;
    c.box.location = placement?.location ?? { kind: 'quay' };
    if (placement) this.events.push({ kind: 'placed', boxId: c.box.id, label: placement.label, dx_cm: placement.dx_cm, dz_cm: placement.dz_cm, yaw_deg: placement.yaw_deg });
    if (c.box.location.kind === 'chassis') {
      this.world.chassis.load.push(c.box.id);
      this.world.chassis.departAt = this.time + this.world.scene.chassis.clearDelay_s;
    }
    this.landing = this.sense(this.load.pose);
  }

  private moveCarriedBox(): void {
    const c = this.carried;
    if (!c) return;
    const pose = this.load.pose;
    c.box.x = pose.x + c.dx;
    c.box.z = this.world.frame.worldZ(pose.fwr + c.dfwr);
    c.box.y = pose.y - this.carriedHeight;
  }

  /** clearDelay_s after a box was set down on the chassis, the tractor takes it away. */
  private clearChassis(): void {
    const ch = this.world.chassis;
    if (ch.departAt === null || this.time < ch.departAt) return;
    for (const id of ch.load) {
      const i = this.world.containers.findIndex((b) => b.id === id);
      if (i >= 0) this.world.containers.splice(i, 1);
      this.events.push({ kind: 'cleared', boxId: id, laneId: ch.laneId });
    }
    ch.load.length = 0;
    ch.departAt = null;
  }
}

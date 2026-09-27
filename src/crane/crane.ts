// The STS crane in its fixed per-step order: anti-sway, drives, wind and sway; plus the view the renderer and HUD read.

import type { Profiles, TestScene } from '../config/profiles';
import type { QuayFrame } from '../core/quayFrame';
import { degToRad, tonnesToKg } from '../core/units';
import { WindField } from '../core/wind';
import type { CraneView } from '../sim/craneView';
import { Boom } from './boom';
import { Gantry } from './gantry';
import { Hoist } from './hoist';
import { SwayModel } from './swayModel';
import { Trolley } from './trolley';
import { type ProjectedAreas, windForce } from './windLoad';

/** Operator commands for one fixed step (keyboard and gamepad already combined). */
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
  /** Anti-sway on/off pressed since the last step. */
  toggleAntiSway: boolean;
}

export const NO_COMMANDS: CraneCommands = { gantry: 0, trolley: 0, hoist: 0, boom: 0, creep: false, toggleAntiSway: false };

export class Crane {
  readonly gantry: Gantry;
  readonly trolley: Trolley;
  readonly hoist: Hoist;
  readonly boom: Boom;
  readonly sway: SwayModel;
  readonly wind: WindField;
  /** Anti-sway switched on by the operator (off at start). */
  antiSway = false;
  /** Faces the wind meets: the bare spreader until a box is locked on. */
  windAreas: ProjectedAreas;

  constructor(
    private readonly profiles: Profiles,
    scene: TestScene,
    private readonly frame: QuayFrame,
  ) {
    const start = scene.crane;
    const s = profiles.sway;
    this.gantry = new Gantry(profiles, scene.quay.length_m, frame.worldX(start.startQuayMark_m));
    this.trolley = new Trolley(profiles, start.startTrolley_m);
    this.hoist = new Hoist(profiles, start.startHoistHeight_m);
    this.boom = new Boom(profiles);
    this.sway = new SwayModel({ substeps: s.substeps, minLength: s.minRopeFall_m, maxAngle: degToRad(s.maxAngle_deg) });
    this.wind = new WindField(scene.wind, frame);
    this.windAreas = { side: s.spreaderAreaSide_m2, end: s.spreaderAreaEnd_m2 };
  }

  /** One fixed step (proposal §5.3): anti-sway from the current swing, drives, then the pendulum. */
  step(dt: number, cmd: CraneCommands): void {
    const s = this.profiles.sway;
    if (cmd.toggleAntiSway) this.antiSway = !this.antiSway;
    const electronic = this.antiSway && s.antiSwayType !== 'rope';
    const ropeDamper = this.antiSway && s.antiSwayType !== 'electronic';

    // Electronic anti-sway: the drive chases the load, k × load offset on the speed reference (a = k·ℓ·θ̇).
    const length = this.ropeFall;
    const offset = this.sway.offsets(length);
    const k = electronic ? s.electronicGain : 0;

    this.boom.step(dt, cmd.boom, {
      trolleyParked: this.trolley.parked,
      hoistAtTop: this.hoist.atTop,
      gantryStopped: !this.gantry.travelling,
    });
    this.gantry.step(dt, cmd.gantry, cmd.creep, k * offset.gantry);
    this.trolley.step(dt, cmd.trolley, cmd.creep, this.boom.down, k * offset.trolley);
    this.hoist.step(dt, cmd.hoist, cmd.creep);

    this.wind.step(dt);
    const force = windForce(this.wind.components(), this.windAreas, s.dragCoefficient);
    const mass = tonnesToKg(this.suspendedMass_t);
    this.sway.step(dt, {
      length,
      lengthRate: -this.hoist.axis.velocity,
      pivotAccelTrolley: this.trolley.axis.acceleration,
      pivotAccelGantry: this.gantry.axis.acceleration,
      windAccelTrolley: force.trolley / mass,
      windAccelGantry: force.gantry / mass,
      damping: s.naturalDamping + (ropeDamper ? s.ropeDamping : 0),
    });
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

  view(): CraneView {
    const length = this.ropeFall;
    const offset = this.sway.offsets(length);
    const x = this.gantry.x;
    return {
      gantryX: x,
      trolleyZ: this.frame.worldZ(this.trolley.fwr),
      boomAngle: this.boom.angleRad,
      load: {
        x: x + offset.gantry,
        y: this.hoist.height + this.sway.rise(length),
        z: this.frame.worldZ(this.trolley.fwr + offset.trolley),
      },
      castingLength: this.profiles.containers.castingSpacingLength_m.ft40,
      flippersDown: 0,
      cornerLanded: { WL: false, WR: false, LL: false, LR: false },
      locked: false,
    };
  }
}

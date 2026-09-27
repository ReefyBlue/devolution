// The STS crane's drives in their fixed per-step order, and the view the renderer and HUD read.

import type { Profiles, TestScene } from '../config/profiles';
import type { QuayFrame } from '../core/quayFrame';
import type { CraneView } from '../sim/craneView';
import { Boom } from './boom';
import { Gantry } from './gantry';
import { Hoist } from './hoist';
import { Trolley } from './trolley';

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
}

export const NO_COMMANDS: CraneCommands = { gantry: 0, trolley: 0, hoist: 0, boom: 0, creep: false };

export class Crane {
  readonly gantry: Gantry;
  readonly trolley: Trolley;
  readonly hoist: Hoist;
  readonly boom: Boom;

  constructor(
    private readonly profiles: Profiles,
    scene: TestScene,
    private readonly frame: QuayFrame,
  ) {
    const start = scene.crane;
    this.gantry = new Gantry(profiles, scene.quay.length_m, frame.worldX(start.startQuayMark_m));
    this.trolley = new Trolley(profiles, start.startTrolley_m);
    this.hoist = new Hoist(profiles, start.startHoistHeight_m);
    this.boom = new Boom(profiles);
  }

  /** One fixed step: boom first (it gates the trolley), then gantry, trolley and hoist. */
  step(dt: number, cmd: CraneCommands): void {
    this.boom.step(dt, cmd.boom, {
      trolleyParked: this.trolley.parked,
      hoistAtTop: this.hoist.atTop,
      gantryStopped: !this.gantry.travelling,
    });
    this.gantry.step(dt, cmd.gantry, cmd.creep);
    this.trolley.step(dt, cmd.trolley, cmd.creep, this.boom.down);
    this.hoist.step(dt, cmd.hoist, cmd.creep);
  }

  view(): CraneView {
    const x = this.gantry.x;
    const z = this.frame.worldZ(this.trolley.fwr);
    return {
      gantryX: x,
      trolleyZ: z,
      boomAngle: this.boom.angleRad,
      load: { x, y: this.hoist.height, z },
      castingLength: this.profiles.containers.castingSpacingLength_m.ft40,
      flippersDown: 0,
      cornerLanded: { WL: false, WR: false, LL: false, LR: false },
      locked: false,
    };
  }
}

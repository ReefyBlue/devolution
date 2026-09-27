// Gantry travel along the rails (world X): end slowdown zones, hard limits at the rail ends
// minus half the buffer-to-buffer width.

import type { Profiles } from '../config/profiles';
import { RampedAxis } from '../core/rampedAxis';
import { driveParams, STOPPED_MPS } from './drive';

export class Gantry {
  readonly axis: RampedAxis;

  constructor(profiles: Profiles, railLength_m: number, startX: number) {
    const half = profiles.crane.bufferToBuffer_m / 2;
    this.axis = new RampedAxis(driveParams(profiles.gantry), { min: half, max: railLength_m - half }, startX);
  }

  /** demand +1 = world +X (right when facing the water). */
  step(dt: number, demand: number, creep: boolean, extraAccel = 0): void {
    this.axis.step(dt, { demand, creep, extraAccel });
  }

  get x(): number {
    return this.axis.position;
  }

  /** True while the gantry moves (the warning bell sounds). */
  get travelling(): boolean {
    return Math.abs(this.axis.velocity) > STOPPED_MPS;
  }
}

// Trolley travel along boom and girder (fromWatersideRail_m, + = waterside): outreach to backreach,
// slowdown zone at each end, and the boom-hinge limit while the boom is not fully down.

import type { Profiles } from '../config/profiles';
import { type AxisCommand, RampedAxis } from '../core/rampedAxis';
import { driveParams } from './drive';

export class Trolley {
  readonly axis: RampedAxis;
  private readonly parkLimit: number;

  constructor(
    private readonly profiles: Profiles,
    startFwr: number,
  ) {
    const c = profiles.crane;
    this.parkLimit = c.boomParkTrolley_m;
    this.axis = new RampedAxis(driveParams(profiles.trolley), { min: -(c.railGauge_m + c.backreach_m), max: c.outreach_m }, startFwr);
  }

  /** Picks up changed drive values (tuning panel). */
  retune(): void {
    this.axis.params = driveParams(this.profiles.trolley);
  }

  /** demand +1 = towards the water. */
  step(dt: number, demand: number, creep: boolean, boomDown: boolean, speedOffset = 0): void {
    const cmd: AxisCommand = { demand, creep, speedOffset };
    if (!boomDown) cmd.travel = { min: -Infinity, max: this.parkLimit };
    this.axis.step(dt, cmd);
  }

  /** fromWatersideRail_m of the rope sheaves. */
  get fwr(): number {
    return this.axis.position;
  }

  /** True when the trolley stands landside of the boom hinge, so the boom may move. */
  get parked(): boolean {
    return this.axis.position <= this.parkLimit + 1e-6;
  }
}

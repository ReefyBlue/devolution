// Hoist (height of the spreader's twistlock plane above the quay apron): load-dependent speed,
// upper pre-limit zone, hard upper and lower limits.

import type { Profiles } from '../config/profiles';
import { RampedAxis } from '../core/rampedAxis';
import { maxHoistSpeed, type HoistSpeedParams } from './hoistSpeed';

/** Within this distance of the upper limit the spreader counts as fully up (boom interlock), m. */
const AT_TOP_M = 0.01;

export class Hoist {
  readonly axis: RampedAxis;
  private readonly speed: HoistSpeedParams;
  /** Mass under the spreader (a locked box), t. */
  load_t = 0;

  constructor(profiles: Profiles, startHeight: number) {
    const h = profiles.hoist;
    const c = profiles.crane;
    this.speed = {
      ratedSpeed: h.ratedSpeed_mps,
      emptySpeed: h.emptySpeed_mps,
      ratedLoad_t: c.ratedLoad_t,
      suspendedTare_t: profiles.spreader.spreaderMass_t + profiles.spreader.headblockMass_t,
    };
    const params = {
      maxSpeed: h.emptySpeed_mps,
      accel: h.accel_mps2,
      decel: h.decel_mps2,
      creepFraction: h.creepFraction,
      zoneAtMax: h.upperZone_m,
      zoneAtMin: 0,
      zoneCapFraction: h.zoneCapFraction,
    };
    this.axis = new RampedAxis(params, { min: -c.liftBelowRail_m, max: c.liftHeight_m }, startHeight);
  }

  /** demand +1 = raise. */
  step(dt: number, demand: number, creep: boolean): void {
    this.axis.step(dt, { demand, creep, speedCap: this.maxSpeed });
  }

  /** Speed limit for the current load, m/s. */
  get maxSpeed(): number {
    return maxHoistSpeed(this.speed, this.load_t);
  }

  get height(): number {
    return this.axis.position;
  }

  get atTop(): boolean {
    return this.axis.position >= this.axis.travel.max - AT_TOP_M;
  }
}

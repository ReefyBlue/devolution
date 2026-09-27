// Hoist (height of the spreader's twistlock plane above the quay apron): load-dependent speed,
// upper pre-limit zone, hard upper and lower limits.

import type { Profiles } from '../config/profiles';
import { type AxisCommand, type DriveParams, RampedAxis } from '../core/rampedAxis';
import { maxHoistSpeed, type HoistSpeedParams } from './hoistSpeed';

/** Within this distance of the upper limit the spreader counts as fully up (boom interlock), m. */
const AT_TOP_M = 0.01;

export class Hoist {
  readonly axis: RampedAxis;
  /** Mass under the spreader (a locked box), t. */
  load_t = 0;

  constructor(
    private readonly profiles: Profiles,
    startHeight: number,
  ) {
    const c = profiles.crane;
    this.axis = new RampedAxis(this.params(), { min: -c.liftBelowRail_m, max: c.liftHeight_m }, startHeight);
  }

  /** Picks up changed hoist values (tuning panel). */
  retune(): void {
    this.axis.params = this.params();
  }

  private params(): DriveParams {
    const h = this.profiles.hoist;
    return {
      maxSpeed: h.emptySpeed_mps,
      accel: h.accel_mps2,
      decel: h.decel_mps2,
      creepFraction: h.creepFraction,
      zoneAtMax: h.upperZone_m,
      zoneAtMin: 0,
      zoneCapFraction: h.zoneCapFraction,
    };
  }

  /**
   * demand +1 = raise. Landed: a lowering command ramps down at slackRopeDecel_mps2 and holds (slack-rope stop);
   * hoisting stays free. While the twistlocks turn the hoist stands.
   */
  step(dt: number, demand: number, creep: boolean, landed: boolean, locksTurning: boolean): void {
    let d = locksTurning ? 0 : demand;
    if (landed) d = Math.max(0, d);
    const cmd: AxisCommand = { demand: d, creep, speedCap: this.maxSpeed };
    if (landed && this.axis.velocity < 0) cmd.decel = this.profiles.hoist.slackRopeDecel_mps2;
    this.axis.step(dt, cmd);
  }

  /** Speed limit for the current load, m/s. */
  get maxSpeed(): number {
    const { hoist: h, crane: c, spreader: sp } = this.profiles;
    const speed: HoistSpeedParams = {
      ratedSpeed: h.ratedSpeed_mps,
      emptySpeed: h.emptySpeed_mps,
      ratedLoad_t: c.ratedLoad_t,
      suspendedTare_t: sp.spreaderMass_t + sp.headblockMass_t,
    };
    return maxHoistSpeed(speed, this.load_t);
  }

  get height(): number {
    return this.axis.position;
  }

  get atTop(): boolean {
    return this.axis.position >= this.axis.travel.max - AT_TOP_M;
  }
}

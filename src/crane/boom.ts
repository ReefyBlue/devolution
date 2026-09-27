// Boom raise/lower (hold-to-run): ramped start and stop, interlocks, and the latch at the raised angle.

import type { Profiles } from '../config/profiles';
import { degToRad } from '../core/units';
import { type DriveParams, RampedAxis } from '../core/rampedAxis';

/** Conditions the boom needs before it may move. */
export interface BoomPermits {
  trolleyParked: boolean;
  hoistAtTop: boolean;
  gantryStopped: boolean;
}

export type BoomInterlock = '' | 'PARK TROLLEY' | 'HOIST TO TOP' | 'STOP GANTRY';

export class Boom {
  /** Boom angle above the working position, degrees. */
  readonly axis: RampedAxis;
  /** Latch engagement: 0 = free, 1 = latched at the raised angle. */
  latch = 0;
  /** Why the last boom command was refused ('' when it was not). */
  interlock: BoomInterlock = '';

  constructor(private readonly profiles: Profiles) {
    this.axis = new RampedAxis(this.params(), { min: 0, max: profiles.boom.raisedAngle_deg }, 0);
  }

  /** Picks up changed boom timings (tuning panel); the raised angle is structural and stays. */
  retune(): void {
    this.axis.params = this.params();
  }

  /** Trapezoidal run: full travel in travelTime_s with a soft start and stop of softStartStop_s each. */
  private params(): DriveParams {
    const b = this.profiles.boom;
    const speed = b.raisedAngle_deg / Math.max(1, b.travelTime_s - b.softStartStop_s);
    const ramp = speed / b.softStartStop_s;
    return { maxSpeed: speed, accel: ramp, decel: ramp, creepFraction: 1, zoneAtMax: 0, zoneAtMin: 0, zoneCapFraction: 1 };
  }

  /** demand +1 = raise, −1 = lower. */
  step(dt: number, demand: number, permits: BoomPermits): void {
    let d = demand;
    const moving = this.axis.velocity !== 0;
    const missing = !permits.trolleyParked ? 'PARK TROLLEY' : !permits.hoistAtTop ? 'HOIST TO TOP' : !permits.gantryStopped ? 'STOP GANTRY' : '';
    // Checked while commanded and while the boom still runs down its soft stop; a trip in motion brakes at once.
    this.interlock = d !== 0 || moving ? missing : '';
    if (this.interlock) {
      d = 0;
      if (moving) this.axis.reset(this.axis.position);
    }

    // At the raised angle the latch engages by itself; lowering first releases it, then the boom moves.
    const atRaised = this.axis.atLimit && this.axis.position >= this.axis.travel.max;
    const latchRate = this.profiles.boom.latchTime_s > 0 ? 1 / this.profiles.boom.latchTime_s : Infinity;
    if (atRaised && d < 0) this.latch = Math.max(0, this.latch - latchRate * dt);
    else if (atRaised) this.latch = Math.min(1, this.latch + latchRate * dt);
    if (this.latch > 0) d = 0;

    this.axis.step(dt, { demand: d, creep: false });
  }

  get angleRad(): number {
    return degToRad(this.axis.position);
  }

  /** Fully down in the working position: the trolley may go out over the water. */
  get down(): boolean {
    return this.axis.position <= 0 && this.axis.velocity === 0;
  }

  get latched(): boolean {
    return this.latch >= 1;
  }
}

// Spreader telescope: both end beams run at telescopeSpeed_mps towards the selected 20/40/45 ft casting spacing.

import type { Profiles } from '../config/profiles';
import type { SizeFt } from '../sim/container';

const SIZES: readonly SizeFt[] = [20, 40, 45];

export type SizeRequest = SizeFt | 'longer' | 'shorter';

export class Telescope {
  /** Selected size. */
  size: SizeFt = 40;
  /** Current distance between the twistlock centres along the spreader, m. */
  length: number;

  constructor(private readonly profiles: Profiles) {
    this.length = this.target;
  }

  /** Distance between the twistlocks for the selected size, m. */
  get target(): number {
    return this.profiles.containers.castingSpacingLength_m[`ft${this.size}`];
  }

  get moving(): boolean {
    return this.length !== this.target;
  }

  select(request: SizeRequest): void {
    const i = SIZES.indexOf(this.size);
    if (request === 'longer') this.size = SIZES[Math.min(i + 1, SIZES.length - 1)] ?? this.size;
    else if (request === 'shorter') this.size = SIZES[Math.max(i - 1, 0)] ?? this.size;
    else this.size = request;
  }

  /** Runs the ends unless blocked (locked, or a corner landed). */
  step(dt: number, blocked: boolean): void {
    if (blocked) return;
    const travel = 2 * this.profiles.spreader.telescopeSpeed_mps * dt;
    const d = this.target - this.length;
    this.length = Math.abs(d) <= travel ? this.target : this.length + Math.sign(d) * travel;
  }
}

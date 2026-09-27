// Wind at the crane: steady mean speed plus gusts that rise and fall over a random interval (seeded).

import type { TestScene } from '../config/profiles';
import type { QuayFrame } from './quayFrame';
import { Random } from './random';
import { knotsToMps } from './units';

type WindSettings = TestScene['wind'];

export class WindField {
  /** Current wind speed, m/s. */
  speed = 0;
  private readonly random: Random;
  private t = 0;
  private interval = 1;
  private peak_kn = 0;

  /** Reads `settings` every step, so changes from the tuning panel apply at once. */
  constructor(
    readonly settings: WindSettings,
    private readonly frame: QuayFrame,
  ) {
    this.random = new Random(settings.seed);
    this.nextGust();
    this.speed = knotsToMps(settings.speed_kn);
  }

  step(dt: number): void {
    this.t += dt;
    if (this.t >= this.interval) {
      this.t -= this.interval;
      this.nextGust();
    }
    const mean = knotsToMps(this.settings.speed_kn);
    const gust = Math.max(0, knotsToMps(this.peak_kn) - mean);
    this.speed = mean + (gust * (1 - Math.cos((2 * Math.PI * this.t) / this.interval))) / 2;
  }

  /** Wind velocity along world +X and towards the water (quay frame), m/s. */
  components(): { alongX: number; towardsWater: number } {
    return this.frame.windComponents(this.speed, this.settings.fromDirection_deg);
  }

  /** Each gust peaks somewhere between halfway to the gust speed and the full gust speed. */
  private nextGust(): void {
    const s = this.settings;
    this.interval = this.random.range(Math.min(s.gustIntervalMin_s, s.gustIntervalMax_s), Math.max(s.gustIntervalMin_s, s.gustIntervalMax_s));
    const extra = Math.max(0, s.gustSpeed_kn - s.speed_kn);
    this.peak_kn = s.speed_kn + extra * this.random.range(0.5, 1);
  }
}

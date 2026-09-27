// Fixed-step clock: turns variable frame times into whole simulation steps plus an interpolation fraction.

/** Simulation step, s (project rule: 50 Hz). */
export const FIXED_DT = 0.02;

/** Longest frame time that is simulated; longer pauses (tab in the background) are dropped. */
const MAX_FRAME_S = 0.1;

export class FixedStepClock {
  private accumulator = 0;

  constructor(readonly dt: number = FIXED_DT) {}

  /** Adds one frame's elapsed time and returns how many steps to run now. */
  advance(frameSeconds: number): number {
    this.accumulator += Math.min(Math.max(frameSeconds, 0), MAX_FRAME_S);
    const steps = Math.floor(this.accumulator / this.dt);
    this.accumulator -= steps * this.dt;
    return steps;
  }

  /** Fraction of a step between the last two simulated states, for render interpolation (0 … 1). */
  get alpha(): number {
    return this.accumulator / this.dt;
  }
}

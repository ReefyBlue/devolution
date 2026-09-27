// Load-dependent hoist speed: constant power between the rated load and an empty spreader.

export interface HoistSpeedParams {
  /** Speed at the rated load, m/s (90 m/min). */
  ratedSpeed: number;
  /** Speed with an empty spreader, m/s (180 m/min); also the cap for light loads. */
  emptySpeed: number;
  /** Rated load under the spreader, t. */
  ratedLoad_t: number;
  /** Spreader + headblock, t (always on the ropes). */
  suspendedTare_t: number;
}

/** Maximum hoist speed for a load under the spreader (0 with an empty spreader), m/s. */
export function maxHoistSpeed(p: HoistSpeedParams, load_t: number): number {
  const power = p.ratedSpeed * (p.ratedLoad_t + p.suspendedTare_t);
  return Math.min(p.emptySpeed, power / (Math.max(0, load_t) + p.suspendedTare_t));
}

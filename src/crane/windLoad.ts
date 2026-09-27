// Wind force on the load: F = ½·ρ·Cd·A·v² per crane axis, with A the face the wind meets.

import { AIR_DENSITY } from '../core/units';

export interface ProjectedAreas {
  /** Long side (faces the trolley axis), m². */
  side: number;
  /** End (faces the gantry axis), m². */
  end: number;
}

/** Signed wind forces along the trolley axis (+ = towards the water) and the gantry axis (+X), N. */
export function windForce(
  wind: { alongX: number; towardsWater: number },
  areas: ProjectedAreas,
  dragCoefficient: number,
): { trolley: number; gantry: number } {
  const q = 0.5 * AIR_DENSITY * dragCoefficient;
  return {
    trolley: q * areas.side * wind.towardsWater * Math.abs(wind.towardsWater),
    gantry: q * areas.end * wind.alongX * Math.abs(wind.alongX),
  };
}

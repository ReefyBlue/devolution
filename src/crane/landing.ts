// Landing pins at the four corners: from the step's candidate pose, find what lies under each corner,
// clamp the pose so nothing sinks into it, and report which corners are seated.

import type { Profiles } from '../config/profiles';
import { type Corner, CORNERS } from '../sim/craneView';
import type { Surface, World } from '../sim/world';

export interface Footprint {
  /** World X and Z of the centre of the landing plane (twistlocks, or a carried box's bottom castings). */
  x: number;
  z: number;
  /** Height of that plane in the candidate pose. */
  y: number;
  castingLength: number;
  castingWidth: number;
  /** A carried box lands on stacking cones, so box tops count the cone gap. */
  carrying: boolean;
  /** Boxes the pins must not see (the carried box). */
  ignore: ReadonlySet<string>;
}

export interface Landing {
  /** Height of the landing plane after the clamp. */
  y: number;
  /** What each corner stands on (null when nothing is within the pin travel). */
  surfaces: Record<Corner, Surface | null>;
  landed: Record<Corner, boolean>;
}

/** Seated means within this distance of the surface, m. */
const SEATED_M = 1e-6;

export function senseCorners(world: World, profiles: Profiles, f: Footprint): Landing {
  const sp = profiles.spreader;
  const gap = f.carrying ? profiles.containers.stackingConeGap_m : 0;
  const surfaces = {} as Record<Corner, Surface | null>;
  const tops = {} as Record<Corner, number>;
  let y = f.y;
  for (const corner of CORNERS) {
    // Corner names as seen from the cabin facing the water: W = waterside (−Z), L = landside; L/R = −X/+X.
    const x = f.x + (corner.endsWith('L') ? -0.5 : 0.5) * f.castingLength;
    const z = f.z + (corner.startsWith('W') ? -0.5 : 0.5) * f.castingWidth;
    // The pin ray starts pinRayOffset above the plane and reaches landingPinTravel below it.
    const s = world.surfaceUnder(x, z, f.y + sp.pinRayOffset_m - gap, f.ignore);
    const top = s ? s.top + (s.kind === 'container' ? gap : 0) : -Infinity;
    const hit = s !== null && top >= f.y - sp.landingPinTravel_m;
    surfaces[corner] = hit ? s : null;
    tops[corner] = hit ? top : -Infinity;
    y = Math.max(y, tops[corner]);
  }
  const landed = {} as Record<Corner, boolean>;
  for (const corner of CORNERS) landed[corner] = tops[corner] >= y - SEATED_M;
  return { y, surfaces, landed };
}

export const allLanded = (l: Landing): boolean => CORNERS.every((c) => l.landed[c]);
export const anyLanded = (l: Landing): boolean => CORNERS.some((c) => l.landed[c]);

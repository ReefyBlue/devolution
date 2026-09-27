// A container box in the world: identity, dimensions and where it rests.

import type { Profiles } from '../config/profiles';

export type SizeFt = 20 | 40 | 45;
export type BoxHeight = 'standard' | 'HC';
export type BoxType = 'DV' | 'HC' | 'RF' | 'OT' | 'TK' | 'FR';

/** Where a box is: in a vessel slot, on the chassis, on the quay apron, or hanging under the spreader. */
export type BoxLocation =
  | { kind: 'vessel'; slot: string }
  | { kind: 'chassis'; position: 'front' | 'centre' | 'rear' }
  | { kind: 'quay' }
  | { kind: 'spreader' };

export interface Container {
  id: string;
  size: SizeFt;
  height: BoxHeight;
  type: BoxType;
  grossWeight_t: number;
  operator: string;
  colour: string;
  location: BoxLocation;
  /** World position of the box's bottom centre and its yaw about Y (rad). */
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface BoxDims {
  length: number;
  width: number;
  height: number;
  /** Distance between corner-casting centres along the length and across the width. */
  castingLength: number;
  castingWidth: number;
}

export function boxDims(c: Pick<Container, 'size' | 'height'>, p: Profiles['containers']): BoxDims {
  const key = `ft${c.size}` as const;
  return {
    length: p.length_m[key],
    width: p.width_m,
    height: p.height_m[c.height],
    castingLength: p.castingSpacingLength_m[key],
    castingWidth: p.castingSpacingWidth_m,
  };
}

/** Axis-aligned footprint and top of a box (boxes stand square to the quay in v1). */
export function boxBounds(c: Container, p: Profiles['containers']): { minX: number; maxX: number; minZ: number; maxZ: number; top: number } {
  const d = boxDims(c, p);
  return { minX: c.x - d.length / 2, maxX: c.x + d.length / 2, minZ: c.z - d.width / 2, maxZ: c.z + d.width / 2, top: c.y + d.height };
}

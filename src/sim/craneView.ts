// What the renderer and HUD need from the crane simulation each frame (world coordinates).

export type Corner = 'WL' | 'WR' | 'LL' | 'LR';
/** Corners as seen from the cabin facing the water: W = waterside (−Z), L = landside (+Z); L/R = −X/+X. */
export const CORNERS: readonly Corner[] = ['WL', 'WR', 'LL', 'LR'];

export interface CraneView {
  /** World X of the crane centreline. */
  gantryX: number;
  /** World Z of the trolley sheaves. */
  trolleyZ: number;
  /** Boom angle above working position, rad. */
  boomAngle: number;
  /** Centre of the spreader's twistlock plane. */
  load: { x: number; y: number; z: number };
  /** Distance between the spreader's twistlock centres along its length, m. */
  castingLength: number;
  /** Flipper position: 0 = up, 1 = down. */
  flippersDown: number;
  cornerLanded: Record<Corner, boolean>;
  locked: boolean;
  /** The box under the spreader and its bottom centre relative to the load point, or null. */
  carried: { id: string; offset: { x: number; y: number; z: number } } | null;
}

/** Blends two simulated states for rendering between fixed steps; discrete fields come from the newer one. */
export function lerpView(a: CraneView, b: CraneView, t: number): CraneView {
  const mix = (p: number, q: number): number => p + (q - p) * t;
  return {
    ...b,
    gantryX: mix(a.gantryX, b.gantryX),
    trolleyZ: mix(a.trolleyZ, b.trolleyZ),
    boomAngle: mix(a.boomAngle, b.boomAngle),
    load: { x: mix(a.load.x, b.load.x), y: mix(a.load.y, b.load.y), z: mix(a.load.z, b.load.z) },
    castingLength: mix(a.castingLength, b.castingLength),
    flippersDown: mix(a.flippersDown, b.flippersDown),
  };
}

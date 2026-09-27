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
}

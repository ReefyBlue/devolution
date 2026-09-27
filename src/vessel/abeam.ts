// Nearest bay and deck row to a point on the quay frame, and "abeam bay / row" for the HUD.

import type { SizeFt } from '../sim/container';
import type { SlotGeometry } from './slotGeometry';

/** Nearest bay for a box size: odd 20 ft bays (lone or halves of a 40 ft bay), even bays for 40/45 ft. */
export function nearestBay(g: SlotGeometry, x: number, size: SizeFt): number {
  const bays = g.positions.flatMap((p) => (size === 20 ? (p.lone20 ? [p.bay] : [p.bay - 1, p.bay + 1]) : p.lone20 ? [] : [p.bay]));
  return nearest(bays, (b) => g.bayWorldX(b), x);
}

/** Nearest deck row to world Z. */
export function nearestDeckRow(g: SlotGeometry, z: number): number {
  const count = g.vessel.bays.rowsOnDeck;
  const rows = Array.from({ length: count }, (_, i) => (count % 2 === 0 ? i + 1 : i));
  return nearest(rows, (r) => deckRowZ(g, r), z);
}

export const deckRowZ = (g: SlotGeometry, row: number): number => g.frame.worldZ(g.rowFromWatersideRail(row, g.vessel.bays.rowsOnDeck));

/** The 40 ft bay and deck row under (x, z), or null when the point is not over the hull. */
export function abeam(g: SlotGeometry, hull: { minX: number; maxX: number; minZ: number; maxZ: number }, x: number, z: number): { bay: number; row: number } | null {
  if (x < hull.minX || x > hull.maxX || z < hull.minZ || z > hull.maxZ) return null;
  const bay = nearest(
    g.positions.map((p) => p.bay),
    (b) => g.bayWorldX(b),
    x,
  );
  return { bay, row: nearestDeckRow(g, z) };
}

function nearest(items: readonly number[], at: (item: number) => number, value: number): number {
  let best = items[0] ?? 0;
  for (const item of items) if (Math.abs(at(item) - value) < Math.abs(at(best) - value)) best = item;
  return best;
}

// Generated pontoon hatch covers: symmetric split of the hold rows across the panels (SCENARIO_FORMAT §1.6).

import { rowStarboardOffset } from './slotGeometry';

/** Hold rows in port → starboard order: … 04 02 (00) 01 03 … */
export function rowsPortToStarboard(count: number): number[] {
  const odd = count % 2 === 1;
  const perSide = odd ? (count - 1) / 2 : count / 2;
  const port = Array.from({ length: perSide }, (_, i) => 2 * (perSide - i));
  const stbd = Array.from({ length: perSide }, (_, i) => 2 * i + 1);
  return [...port, ...(odd ? [0] : []), ...stbd];
}

/** Rows per panel, port → starboard; at least 3 rows per generated panel where the bay allows. */
export function panelSizes(rows: number, panelsAcross: number): number[] {
  const panels = Math.min(panelsAcross, Math.max(1, Math.floor(rows / 3)));
  const base = Math.floor(rows / panels);
  let rest = rows - base * panels;
  const sizes = Array.from({ length: panels }, () => base);
  if (panels % 2 === 1) {
    sizes[(panels - 1) / 2] = base + rest;
  } else {
    const portCentre = panels / 2 - 1;
    while (rest >= 2) {
      sizes[portCentre] = (sizes[portCentre] ?? 0) + 1;
      sizes[portCentre + 1] = (sizes[portCentre + 1] ?? 0) + 1;
      rest -= 2;
    }
    if (rest === 1) sizes[portCentre] = (sizes[portCentre] ?? 0) + 1;
  }
  return sizes;
}

export interface CoverPanel {
  id: string;
  bay: number;
  rows: number[];
  /** Transverse extent as offsets towards starboard from the centreline, m. */
  starboardMin: number;
  starboardMax: number;
}

/** Panels for one bay, ids "<bay>-<n>" numbered port → starboard. */
export function coverPanels(bay: number, rowsInHold: number, panelsAcross: number, rowPitch: number): CoverPanel[] {
  const order = rowsPortToStarboard(rowsInHold);
  const sizes = panelSizes(rowsInHold, panelsAcross);
  const panels: CoverPanel[] = [];
  let i = 0;
  sizes.forEach((n, k) => {
    const rows = order.slice(i, i + n);
    i += n;
    const offsets = rows.map((r) => rowStarboardOffset(r, rowsInHold, rowPitch));
    panels.push({
      id: `${String(bay).padStart(2, '0')}-${k + 1}`,
      bay,
      rows,
      starboardMin: Math.min(...offsets) - rowPitch / 2,
      starboardMax: Math.max(...offsets) + rowPitch / 2,
    });
  });
  return panels;
}

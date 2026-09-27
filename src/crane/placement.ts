// Where a released box ended up: the nearest vessel slot, chassis position or the quay, with its offset
// from the nominal position of that place.

import { formatSlot, parseSlot } from '../core/slotAddress';
import type { BoxLocation, Container } from '../sim/container';
import type { Surface, World } from '../sim/world';
import { deckRowZ, nearestBay, nearestDeckRow } from '../vessel/abeam';

export interface Placement {
  location: BoxLocation;
  /** Short text for the HUD, e.g. "L1 centre", "14-02-88" or "quay". */
  label: string;
  /** Offset from the nominal position along world X and towards the landside, cm; yaw, degrees. */
  dx_cm: number;
  dz_cm: number;
  yaw_deg: number;
}

export function registerPlacement(box: Container, support: Surface, world: World): Placement {
  const yaw_deg = (box.yaw * 180) / Math.PI;
  const offset = (x: number, z: number) => ({ dx_cm: (box.x - x) * 100, dz_cm: (box.z - z) * 100, yaw_deg });

  if (support.kind === 'chassis') {
    const ch = world.chassis;
    const position = ch.nearestPosition(box.size, box.x);
    return { location: { kind: 'chassis', position }, label: `${ch.laneId} ${position}`, ...offset(ch.slotX(box.size, position), ch.z) };
  }

  const below = support.containerId ? world.container(support.containerId) : undefined;
  const onVessel = support.kind === 'cover' || support.kind === 'deck' || below?.location.kind === 'vessel';
  if (!onVessel) return { location: { kind: 'quay' }, label: 'quay', dx_cm: 0, dz_cm: 0, yaw_deg };

  const g = world.geometry;
  const bay = nearestBay(g, box.x, box.size);
  const row = nearestDeckRow(g, box.z);
  const belowTier = below?.location.kind === 'vessel' ? parseSlot(below.location.slot)?.tier : undefined;
  const tier = belowTier !== undefined ? belowTier + 2 : g.vessel.structure.firstDeckTier;
  const slot = formatSlot({ bay, row, tier });
  return { location: { kind: 'vessel', slot }, label: slot, ...offset(g.bayWorldX(bay), deckRowZ(g, row)) };
}

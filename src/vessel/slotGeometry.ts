// Vessel geometry from scenario-style data: bay walk, bay and row positions, vertical datum.
// Field names follow docs/SCENARIO_FORMAT.md so the Phase 2 loader can feed this directly.

import type { QuayFrame } from '../core/quayFrame';

export interface VesselLayout {
  loa_m: number;
  beam_m: number;
  draught_m: number;
  deckHeightAboveWaterline_m: number;
  mooring: { sideAlongside: 'port' | 'starboard'; bowAtQuayMark_m: number; offFender_m: number };
  structure: {
    tankTopAboveKeel_m: number;
    hatchCoamingHeight_m: number;
    rowPitch_m: number;
    firstHoldTier: number;
    firstDeckTier: number;
    hatchCoverThickness_m: number;
  };
  bays: {
    count: number;
    firstBayCentreFromBow_m: number;
    pitch_m: number;
    rowsInHold: number;
    rowsOnDeck: number;
    tiersInHold: number;
    tiersOnDeck: number;
    twentyOnlyBays: number[];
    gaps: { afterBay: number; length_m: number; structure: 'deckhouse' | 'funnel' | 'gap'; heightAboveDeck_m: number }[];
  };
}

export interface BayPosition {
  /** 40 ft bay number (even) or lone 20 ft bay number (odd). */
  bay: number;
  lone20: boolean;
  centreFromBow_m: number;
  length_m: number;
}

/** Half the distance between the centres of the two 20 ft halves of a 40 ft bay: 6.058/2 + 0.076/2. */
export const TWENTY_FT_HALF_OFFSET_M = 3.067;

export class SlotGeometry {
  readonly positions: BayPosition[];

  constructor(
    readonly vessel: VesselLayout,
    readonly frame: QuayFrame,
  ) {
    this.positions = walkBays(vessel);
  }

  /** Starboard side alongside puts the bow at world +X; port side at world −X. */
  get bowPointsPlusX(): boolean {
    return this.vessel.mooring.sideAlongside === 'starboard';
  }

  position(bay: number): BayPosition | undefined {
    return this.positions.find((p) => p.bay === bay);
  }

  /** World X of a bay centre; odd bays inside a 40 ft bay sit forward (B−1) or aft (B+1) of it. */
  bayWorldX(bay: number): number {
    const own = this.position(bay);
    let fromBow: number;
    if (own) fromBow = own.centreFromBow_m;
    else {
      const forwardHalf = this.position(bay + 1);
      const aftHalf = this.position(bay - 1);
      if (forwardHalf && !forwardHalf.lone20) fromBow = forwardHalf.centreFromBow_m - TWENTY_FT_HALF_OFFSET_M;
      else if (aftHalf && !aftHalf.lone20) fromBow = aftHalf.centreFromBow_m + TWENTY_FT_HALF_OFFSET_M;
      else throw new Error(`bay ${bay} does not exist on this vessel`);
    }
    const bowX = this.frame.worldX(this.vessel.mooring.bowAtQuayMark_m);
    return this.bowPointsPlusX ? bowX - fromBow : bowX + fromBow;
  }

  bayQuayMark(bay: number): number {
    return this.frame.quayMark(this.bayWorldX(bay));
  }

  /** fromWatersideRail_m of the ship's side at the fender and of the centreline. */
  get sideFromWatersideRail(): number {
    return this.frame.quay.watersideRailToFenderLine_m + this.vessel.mooring.offFender_m;
  }

  get centrelineFromWatersideRail(): number {
    return this.sideFromWatersideRail + this.vessel.beam_m / 2;
  }

  /** fromWatersideRail_m of a row, for a bay layer with `rowCount` rows. */
  rowFromWatersideRail(row: number, rowCount: number): number {
    const towardsStarboard = rowStarboardOffset(row, rowCount, this.vessel.structure.rowPitch_m);
    // Starboard side alongside: starboard rows lie towards the quay (smaller fromWatersideRail_m).
    const sign = this.vessel.mooring.sideAlongside === 'starboard' ? -1 : 1;
    return this.centrelineFromWatersideRail + sign * towardsStarboard;
  }

  // Vertical datum, Y above the quay apron.
  get keelY(): number {
    return -this.frame.quay.apronAboveWaterline_m - this.vessel.draught_m;
  }
  get tankTopY(): number {
    return this.keelY + this.vessel.structure.tankTopAboveKeel_m;
  }
  get mainDeckY(): number {
    return -this.frame.quay.apronAboveWaterline_m + this.vessel.deckHeightAboveWaterline_m;
  }
  get coverUndersideY(): number {
    return this.mainDeckY + this.vessel.structure.hatchCoamingHeight_m;
  }
  /** Base of the first deck tier (cover top; pedestal rows at the same level). */
  get firstDeckTierBaseY(): number {
    return this.coverUndersideY + this.vessel.structure.hatchCoverThickness_m;
  }
}

/** Walks the odd bay numbers from the bow; lone 20 ft bays are half a pitch long. */
export function walkBays(v: VesselLayout): BayPosition[] {
  const lone = new Set(v.bays.twentyOnlyBays);
  const out: BayPosition[] = [];
  let odd = 1;
  let forties = 0;
  let centre = v.bays.firstBayCentreFromBow_m;
  let prev: BayPosition | undefined;
  while (forties < v.bays.count || lone.has(odd)) {
    const isLone = lone.has(odd);
    const bay = isLone ? odd : odd + 1;
    const length = isLone ? v.bays.pitch_m / 2 : v.bays.pitch_m;
    if (prev) {
      const gap = v.bays.gaps.find((g) => g.afterBay === prev?.bay)?.length_m ?? 0;
      centre += (prev.length_m + length) / 2 + gap;
    }
    prev = { bay, lone20: isLone, centreFromBow_m: centre, length_m: length };
    out.push(prev);
    if (isLone) odd += 2;
    else {
      odd += 4;
      forties++;
    }
  }
  return out;
}

/** Offset of a row towards starboard (negative = port), in metres. */
export function rowStarboardOffset(row: number, rowCount: number, pitch: number): number {
  if (row === 0) return 0;
  const steps = rowCount % 2 === 1 ? Math.ceil(row / 2) : Math.ceil(row / 2) - 0.5;
  return (row % 2 === 1 ? 1 : -1) * steps * pitch;
}

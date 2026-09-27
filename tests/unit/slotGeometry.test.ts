import { describe, expect, it } from 'vitest';
import { QuayFrame } from '../../src/core/quayFrame';
import { SlotGeometry, type VesselLayout, rowStarboardOffset, walkBays } from '../../src/vessel/slotGeometry';

const quay = { length_m: 800, marksIncreaseTo: 'right' as const, orientation_deg: 160, watersideRailToFenderLine_m: 4.5, apronAboveWaterline_m: 5 };

/** The example scenario's vessel (deepsea-bay22-mixed.json). */
const deepSea: VesselLayout = {
  loa_m: 334,
  beam_m: 45.6,
  draught_m: 13,
  deckHeightAboveWaterline_m: 11.6,
  mooring: { sideAlongside: 'starboard', bowAtQuayMark_m: 600, offFender_m: 0 },
  structure: { tankTopAboveKeel_m: 2, hatchCoamingHeight_m: 1.8, rowPitch_m: 2.55, firstHoldTier: 2, firstDeckTier: 82, hatchCoverThickness_m: 0.9 },
  bays: {
    count: 20,
    firstBayCentreFromBow_m: 24,
    pitch_m: 13.4,
    rowsInHold: 15,
    rowsOnDeck: 17,
    tiersInHold: 9,
    tiersOnDeck: 8,
    twentyOnlyBays: [],
    gaps: [{ afterBay: 54, length_m: 18, structure: 'deckhouse', heightAboveDeck_m: 32 }],
  },
};

describe('SlotGeometry (example vessel)', () => {
  const g = new SlotGeometry(deepSea, new QuayFrame(quay));

  it('numbers 40 ft bays 02, 06 … 78', () => {
    expect(g.positions.map((p) => p.bay).slice(0, 4)).toEqual([2, 6, 10, 14]);
    expect(g.positions.at(-1)?.bay).toBe(78);
  });

  it('places bay 22 at quay mark 509.0 and its halves at 512.07 / 505.93', () => {
    expect(g.bayQuayMark(22)).toBeCloseTo(509.0, 6);
    expect(g.bayQuayMark(21)).toBeCloseTo(512.067, 3);
    expect(g.bayQuayMark(23)).toBeCloseTo(505.933, 3);
  });

  it('adds the deckhouse gap after bay 54', () => {
    const after = g.position(58);
    const before = g.position(54);
    expect((after?.centreFromBow_m ?? 0) - (before?.centreFromBow_m ?? 0)).toBeCloseTo(13.4 + 18, 6);
  });

  it('puts the 17 deck rows between WS 6.90 (row 15) and WS 47.70 (row 16)', () => {
    expect(g.centrelineFromWatersideRail).toBeCloseTo(27.3, 6);
    expect(g.rowFromWatersideRail(16, 17)).toBeCloseTo(47.7, 6);
    expect(g.rowFromWatersideRail(15, 17)).toBeCloseTo(6.9, 6);
    expect(g.rowFromWatersideRail(0, 17)).toBeCloseTo(27.3, 6);
  });

  it('has the vertical datum of the worked example', () => {
    expect(g.keelY).toBeCloseTo(-18, 6);
    expect(g.tankTopY).toBeCloseTo(-16, 6);
    expect(g.mainDeckY).toBeCloseTo(6.6, 6);
    expect(g.coverUndersideY).toBeCloseTo(8.4, 6);
    expect(g.firstDeckTierBaseY).toBeCloseTo(9.3, 6);
  });
});

describe('bay walk with lone 20 ft bays', () => {
  it('shifts the numbering after lone bay 01: 01, 04, 08, 12', () => {
    const v = { ...deepSea, bays: { ...deepSea.bays, count: 3, twentyOnlyBays: [1], gaps: [] } };
    const bays = walkBays(v);
    expect(bays.map((b) => b.bay)).toEqual([1, 4, 8, 12]);
    expect(bays[0]?.lone20).toBe(true);
    // Lone bay is half a pitch long: 01 → 04 centres are 0.75 pitch apart.
    expect((bays[1]?.centreFromBow_m ?? 0) - (bays[0]?.centreFromBow_m ?? 0)).toBeCloseTo(0.75 * 13.4, 6);
  });
});

describe('row offsets', () => {
  it('uses row 00 on the centreline for odd counts and half pitches for even counts', () => {
    expect(rowStarboardOffset(1, 17, 2.55)).toBeCloseTo(2.55);
    expect(rowStarboardOffset(2, 17, 2.55)).toBeCloseTo(-2.55);
    expect(rowStarboardOffset(1, 6, 2.55)).toBeCloseTo(1.275);
    expect(rowStarboardOffset(6, 6, 2.55)).toBeCloseTo(-6.375);
  });
});

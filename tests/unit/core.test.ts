import { describe, expect, it } from 'vitest';
import { checkDigit, isValidContainerId, makeContainerId } from '../../src/core/iso6346';
import { QuayFrame } from '../../src/core/quayFrame';
import { formatSlot, parseSlot } from '../../src/core/slotAddress';
import { formatFromWatersideRail, knotsToMps } from '../../src/core/units';

describe('ISO 6346', () => {
  it('accepts the standard test vector CSQU3054383', () => {
    expect(checkDigit('CSQU305438')).toBe(3);
    expect(isValidContainerId('CSQU3054383')).toBe(true);
    expect(isValidContainerId('CSQU3054384')).toBe(false);
  });

  it('builds valid numbers', () => {
    const id = makeContainerId('MSKU', 1234);
    expect(id).toMatch(/^MSKU001234\d$/);
    expect(isValidContainerId(id)).toBe(true);
  });
});

describe('slot strings', () => {
  it('parses and formats bay-row-tier', () => {
    expect(parseSlot('22-04-84')).toEqual({ bay: 22, row: 4, tier: 84 });
    expect(formatSlot({ bay: 2, row: 0, tier: 82 })).toBe('02-00-82');
    expect(parseSlot('22-4-84')).toBeNull();
  });
});

describe('quay frame', () => {
  const quay = { length_m: 800, orientation_deg: 160, watersideRailToFenderLine_m: 4.5, apronAboveWaterline_m: 5 };

  it('maps quay marks for both mark directions', () => {
    expect(new QuayFrame({ ...quay, marksIncreaseTo: 'right' }).worldX(509)).toBe(509);
    expect(new QuayFrame({ ...quay, marksIncreaseTo: 'left' }).worldX(509)).toBe(291);
  });

  it('puts the water at world −Z', () => {
    const f = new QuayFrame({ ...quay, marksIncreaseTo: 'right' });
    expect(f.worldZ(32.4)).toBeCloseTo(-32.4);
    expect(f.fromWatersideRail(8.5)).toBeCloseTo(-8.5);
  });

  it('wind from 250° blows straight towards the water when the marks point to 160° (example scenario)', () => {
    const w = new QuayFrame({ ...quay, marksIncreaseTo: 'right' }).windComponents(20, 250);
    expect(w.towardsWater).toBeCloseTo(20, 6);
    expect(w.alongX).toBeCloseTo(0, 6);
  });

  it('formats positions and units for the HUD', () => {
    expect(formatFromWatersideRail(32.44)).toBe('WS 32.4 m');
    expect(formatFromWatersideRail(-12)).toBe('LS 12.0 m');
    expect(knotsToMps(20)).toBeCloseTo(10.289, 3);
  });
});

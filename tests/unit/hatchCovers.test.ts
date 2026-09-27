import { describe, expect, it } from 'vitest';
import { coverPanels, panelSizes, rowsPortToStarboard } from '../../src/vessel/hatchCovers';

describe('hatch cover panels', () => {
  it('orders rows port to starboard', () => {
    expect(rowsPortToStarboard(5)).toEqual([4, 2, 0, 1, 3]);
    expect(rowsPortToStarboard(6)).toEqual([6, 4, 2, 1, 3, 5]);
  });

  it('splits symmetrically as documented', () => {
    expect(panelSizes(15, 3)).toEqual([5, 5, 5]);
    expect(panelSizes(17, 3)).toEqual([5, 7, 5]);
    expect(panelSizes(16, 3)).toEqual([5, 6, 5]);
    expect(panelSizes(13, 2)).toEqual([7, 6]);
    expect(panelSizes(14, 4)).toEqual([3, 4, 4, 3]);
    expect(panelSizes(15, 4)).toEqual([3, 5, 4, 3]);
    expect(panelSizes(7, 3)).toEqual([4, 3]);
    expect(panelSizes(5, 3)).toEqual([5]);
  });

  it('gives bay 22 of the example vessel panels 22-1 … 22-3 with the documented rows', () => {
    const panels = coverPanels(22, 15, 3, 2.55);
    expect(panels.map((p) => p.id)).toEqual(['22-1', '22-2', '22-3']);
    expect(panels[1]?.rows).toEqual([4, 2, 0, 1, 3]);
    expect((panels[1]?.starboardMax ?? 0) - (panels[1]?.starboardMin ?? 0)).toBeCloseTo(12.75, 6);
  });
});

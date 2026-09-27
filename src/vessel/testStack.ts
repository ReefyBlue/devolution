// Generates the Phase 1 deck stack from config/test-scene.json: real slot positions, valid ISO 6346 ids,
// seeded weights that get lighter towards the top, operator colours.

import type { Profiles, TestScene } from '../config/profiles';
import { makeContainerId } from '../core/iso6346';
import { Random } from '../core/random';
import { formatSlot } from '../core/slotAddress';
import type { Container, SizeFt } from '../sim/container';
import { boxDims } from '../sim/container';
import type { SlotGeometry } from './slotGeometry';

export function buildTestStack(scene: TestScene, profiles: Profiles, geometry: SlotGeometry): Container[] {
  const { deckStack } = scene;
  const rng = new Random(deckStack.seed);
  const cp = profiles.containers;
  const gap = cp.stackingConeGap_m;
  const baseY = geometry.firstDeckTierBaseY;
  const rowsOnDeck = scene.vessel.bays.rowsOnDeck;
  const boxes: Container[] = [];

  const makeBox = (size: SizeFt, code: string, bay: number, row: number, tier: number, tierIndex: number, bottom: number): Container => {
    const operator = rng.pick(deckStack.operators);
    const op = profiles.palette.operators[operator];
    if (!op) throw new Error(`operator ${operator} missing from the palette`);
    const height = code === '40HC' ? 'HC' : 'standard';
    const type = code === '40HC' ? 'HC' : 'DV';
    const tare = cp.tare_t[`${size}${type}`] ?? 0;
    const w = deckStack.weightByTier_t[tierIndex] ?? { min: tare, max: tare };
    const gross = Math.max(tare, Math.round(rng.range(w.min, w.max) * 10) / 10);
    return {
      id: makeContainerId(rng.pick(op.prefixes), rng.int(1_000_000)),
      size,
      height,
      type,
      grossWeight_t: gross,
      operator,
      colour: op.colour,
      location: { kind: 'vessel', slot: formatSlot({ bay, row, tier }) },
      x: geometry.bayWorldX(bay),
      y: bottom,
      z: geometry.frame.worldZ(geometry.rowFromWatersideRail(row, rowsOnDeck)),
      yaw: 0,
    };
  };

  for (const stack of deckStack.bays) {
    for (const row of deckStack.rows) {
      // Top of each 20 ft half of the 40 ft bay; a 40 ft box spans both.
      let fwdTop = baseY;
      let aftTop = baseY;
      stack.tiers.forEach((code, k) => {
        const tier = deckStack.firstTier + 2 * k;
        if (code === '20DV') {
          for (const half of [-1, 1] as const) {
            const top = half < 0 ? fwdTop : aftTop;
            const bottom = top === baseY ? baseY : top + gap;
            const box = makeBox(20, code, stack.bay + half, row, tier, k, bottom);
            boxes.push(box);
            const newTop = bottom + boxDims(box, cp).height;
            if (half < 0) fwdTop = newTop;
            else aftTop = newTop;
          }
        } else {
          const top = Math.max(fwdTop, aftTop);
          const bottom = top === baseY ? baseY : top + gap;
          const box = makeBox(40, code, stack.bay, row, tier, k, bottom);
          boxes.push(box);
          fwdTop = aftTop = bottom + boxDims(box, cp).height;
        }
      });
    }
  }
  return boxes;
}

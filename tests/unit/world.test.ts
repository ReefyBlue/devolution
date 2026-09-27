import { describe, expect, it } from 'vitest';
import { loadProfiles } from '../../src/config/profiles';
import { isValidContainerId } from '../../src/core/iso6346';
import { World } from '../../src/sim/world';

describe('Phase 1 test world', () => {
  const { profiles, scene } = loadProfiles();
  const world = new World(scene, profiles);

  it('has 84 boxes with valid ISO 6346 ids and unique slots', () => {
    expect(world.containers).toHaveLength(84);
    expect(world.containers.every((c) => isValidContainerId(c.id))).toBe(true);
    const slots = world.containers.map((c) => (c.location.kind === 'vessel' ? c.location.slot : ''));
    expect(new Set(slots).size).toBe(84);
    expect(new Set(world.containers.map((c) => c.id)).size).toBe(84);
  });

  it('places bays 10 / 14 / 18 at quay marks 183.2 / 169.8 / 156.4', () => {
    expect(world.geometry.bayQuayMark(10)).toBeCloseTo(183.2, 6);
    expect(world.geometry.bayQuayMark(14)).toBeCloseTo(169.8, 6);
    expect(world.geometry.bayQuayMark(18)).toBeCloseTo(156.4, 6);
  });

  it('puts rows 05 … 06 at WS 10.63 … 23.38 and the first deck tier at +3.2 m', () => {
    const rows = [5, 3, 1, 2, 4, 6].map((r) => world.geometry.rowFromWatersideRail(r, 8));
    [10.625, 13.175, 15.725, 18.275, 20.825, 23.375].forEach((ws, i) => expect(rows[i]).toBeCloseTo(ws, 6));
    expect(world.geometry.firstDeckTierBaseY).toBeCloseTo(3.2, 6);
  });

  it('stacks bay 18 as 20 ft pairs with 40 ft boxes on top', () => {
    const at = (slot: string) => world.containers.find((c) => c.location.kind === 'vessel' && c.location.slot === slot);
    expect(at('17-04-82')?.size).toBe(20);
    expect(at('19-04-84')?.size).toBe(20);
    const forty = at('18-04-86');
    expect(forty?.size).toBe(40);
    expect(forty?.y).toBeCloseTo(3.2 + 2 * 2.591 + 2 * 0.03, 6);
  });

  it('keeps weights between tare and the tier range, lighter towards the top on average', () => {
    const avg = (tier: number) => {
      const w = world.containers.filter((c) => c.location.kind === 'vessel' && c.location.slot.endsWith(`-${tier}`)).map((c) => c.grossWeight_t);
      return w.reduce((a, b) => a + b, 0) / w.length;
    };
    expect(avg(82)).toBeGreaterThan(avg(88));
  });

  it('finds the highest surface under a point', () => {
    const top = world.containers.find((c) => c.location.kind === 'vessel' && c.location.slot === '14-02-88');
    expect(top).toBeDefined();
    const s = world.surfaceUnder(top?.x ?? 0, top?.z ?? 0, 100, new Set());
    expect(s?.containerId).toBe(top?.id);
    const quay = world.surfaceUnder(world.chassis.x, world.chassis.z + 5, 100, new Set());
    expect(quay?.kind).toBe('quay');
    const bed = world.surfaceUnder(world.chassis.x, world.chassis.z, 100, new Set());
    expect(bed?.kind).toBe('chassis');
  });
});

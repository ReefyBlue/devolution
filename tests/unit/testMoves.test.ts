import { describe, expect, it } from 'vitest';
import { loadProfiles } from '../../src/config/profiles';
import { TestMoves } from '../../src/sim/testMoves';
import { World } from '../../src/sim/world';
import { abeam } from '../../src/vessel/abeam';

function setup() {
  const { profiles, scene } = loadProfiles();
  const world = new World(scene, profiles);
  return { world, moves: new TestMoves(scene.testMoves, world) };
}

describe('TestMoves', () => {
  it('starts with 14-02-88 and its box', () => {
    const { world, moves } = setup();
    expect(moves.current?.from).toBe('14-02-88');
    const box = world.container(moves.boxId ?? '');
    expect(box?.location).toEqual({ kind: 'vessel', slot: '14-02-88' });
  });

  it('completes a move when its box is unlocked on the target chassis position, then starts the next', () => {
    const { world, moves } = setup();
    const box = world.container(moves.boxId ?? '');
    if (!box) throw new Error('no box');
    const placed = { kind: 'placed' as const, boxId: box.id, label: 'L1 centre', dx_cm: 1.5, dz_cm: -0.5, yaw_deg: 0 };

    box.location = { kind: 'chassis', position: 'rear' };
    moves.onEvent(placed, 40);
    expect(moves.index).toBe(0);

    box.location = { kind: 'chassis', position: 'centre' };
    moves.onEvent(placed, 75);
    expect(moves.results).toHaveLength(1);
    expect(moves.results[0]?.time_s).toBe(75);
    expect(moves.current?.from).toBe('18-04-88');
    expect(moves.startedAt).toBe(75);
    expect(world.container(moves.boxId ?? '')?.location).toEqual({ kind: 'vessel', slot: '18-04-88' });
  });
});

describe('TestMoves: wrong position and missed moves', () => {
  it('flags a wrong chassis position, and a box taken away counts as missed and the next move starts', () => {
    const { world, moves } = setup();
    const box = world.container(moves.boxId ?? '');
    if (!box) throw new Error('no box');
    box.location = { kind: 'chassis', position: 'front' };
    expect(moves.onEvent({ kind: 'placed', boxId: box.id, label: 'L1 front', dx_cm: 0, dz_cm: 0, yaw_deg: 0 }, 50)).toBe('wrongPosition');
    expect(moves.onEvent({ kind: 'cleared', boxId: box.id, laneId: 'L1' }, 55)).toBe('missed');
    expect(moves.last?.outcome).toBe('missed');
    expect(moves.current?.from).toBe('18-04-88');
    expect(moves.boxId).not.toBeNull();
  });
});

describe('abeam', () => {
  it('names bay 14 row 02 over that stack and nothing over the quay', () => {
    const { world } = setup();
    const g = world.geometry;
    const hull = world.vesselBounds();
    expect(abeam(g, hull, 169.8, world.frame.worldZ(18.275))).toEqual({ bay: 14, row: 2 });
    expect(abeam(g, hull, 183.2, world.frame.worldZ(10.625))).toEqual({ bay: 10, row: 5 });
    expect(abeam(g, hull, 169.8, world.frame.worldZ(-8.5))).toBeNull();
  });
});

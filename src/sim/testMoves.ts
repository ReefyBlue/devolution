// The Phase 1 move list (config/test-scene.json): the current move and its timer; a move is done when its
// box is unlocked on the target chassis position, and the next one starts.

import type { TestScene } from '../config/profiles';
import type { CraneEvent } from '../crane/events';
import type { World } from './world';

type Move = TestScene['testMoves'][number];

export interface MoveResult {
  move: Move;
  boxId: string;
  time_s: number;
  dx_cm: number;
  dz_cm: number;
  yaw_deg: number;
}

export class TestMoves {
  index = 0;
  /** Simulation time the current move started. */
  startedAt = 0;
  /** Box of the current move, found in its slot when the move starts. */
  boxId: string | null;
  readonly results: MoveResult[] = [];

  constructor(
    private readonly moves: readonly Move[],
    private readonly world: World,
  ) {
    this.boxId = this.findBox();
  }

  get current(): Move | null {
    return this.moves[this.index] ?? null;
  }

  /** Watches for the current box being placed on its target. */
  onEvent(e: CraneEvent, time: number): void {
    const move = this.current;
    if (e.kind !== 'placed' || !move || e.boxId !== this.boxId) return;
    const loc = this.world.container(e.boxId)?.location;
    if (loc?.kind !== 'chassis' || loc.position !== move.chassisPosition || this.world.chassis.laneId !== move.to) return;
    this.results.push({ move, boxId: e.boxId, time_s: time - this.startedAt, dx_cm: e.dx_cm, dz_cm: e.dz_cm, yaw_deg: e.yaw_deg });
    this.index++;
    this.startedAt = time;
    this.boxId = this.findBox();
  }

  private findBox(): string | null {
    const from = this.current?.from;
    return this.world.containers.find((b) => b.location.kind === 'vessel' && b.location.slot === from)?.id ?? null;
  }
}

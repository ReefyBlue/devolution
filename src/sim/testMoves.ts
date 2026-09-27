// The Phase 1 move list (config/test-scene.json): the current move and its timer. A move is done when its
// box is unlocked on the target chassis position, missed when the tractor leaves with it anywhere else;
// then the next one starts.

import type { TestScene } from '../config/profiles';
import type { CraneEvent } from '../crane/events';
import type { World } from './world';

type Move = TestScene['testMoves'][number];

export interface MoveResult {
  move: Move;
  boxId: string;
  /** Done: unlocked on the target; missed: the tractor left with the box in the wrong place. */
  outcome: 'done' | 'missed';
  time_s: number;
  dx_cm: number;
  dz_cm: number;
  yaw_deg: number;
}

/** What an event meant for the current move, for the HUD. */
export type MoveUpdate = 'done' | 'wrongPosition' | 'missed' | null;

export class TestMoves {
  index = 0;
  /** Simulation time the current move started. */
  startedAt = 0;
  /** Box of the current move, found in its slot when the move starts. */
  boxId: string | null;
  readonly results: MoveResult[] = [];
  private lastPlacement = { dx_cm: 0, dz_cm: 0, yaw_deg: 0 };

  constructor(
    private readonly moves: readonly Move[],
    private readonly world: World,
  ) {
    this.boxId = this.findBox();
  }

  get current(): Move | null {
    return this.moves[this.index] ?? null;
  }

  /** Follows the current move's box: placed on its target (done), elsewhere on the chassis, or taken away. */
  onEvent(e: CraneEvent, time: number): MoveUpdate {
    const move = this.current;
    if (!move || (e.kind !== 'placed' && e.kind !== 'cleared') || e.boxId !== this.boxId) return null;
    if (e.kind === 'cleared') {
      this.finish(move, 'missed', time);
      return 'missed';
    }
    this.lastPlacement = { dx_cm: e.dx_cm, dz_cm: e.dz_cm, yaw_deg: e.yaw_deg };
    const loc = this.world.container(e.boxId)?.location;
    if (loc?.kind !== 'chassis') return null;
    if (loc.position !== move.chassisPosition || this.world.chassis.laneId !== move.to) return 'wrongPosition';
    this.finish(move, 'done', time);
    return 'done';
  }

  /** The move just finished (the last result). */
  get last(): MoveResult | undefined {
    return this.results[this.results.length - 1];
  }

  private finish(move: Move, outcome: MoveResult['outcome'], time: number): void {
    this.results.push({ move, boxId: this.boxId ?? '', outcome, time_s: time - this.startedAt, ...this.lastPlacement });
    this.index++;
    this.startedAt = time;
    this.boxId = this.findBox();
  }

  private findBox(): string | null {
    const from = this.current?.from;
    return this.world.containers.find((b) => b.location.kind === 'vessel' && b.location.slot === from)?.id ?? null;
  }
}

// Twistlocks: open ⇄ locked, each turn takes twistlockTurn_s. The interlocks are checked by the caller.

export type LockState = 'open' | 'locking' | 'locked' | 'unlocking';

export class Twistlocks {
  state: LockState = 'open';
  private elapsed = 0;

  constructor(private readonly turn_s: () => number) {}

  get turning(): boolean {
    return this.state === 'locking' || this.state === 'unlocking';
  }

  /** Starts a turn from open or locked. */
  start(): void {
    if (this.state === 'open') this.state = 'locking';
    else if (this.state === 'locked') this.state = 'unlocking';
    this.elapsed = 0;
  }

  /** Stops a turn and returns the locks to where they started. */
  abort(): void {
    if (this.state === 'locking') this.state = 'open';
    else if (this.state === 'unlocking') this.state = 'locked';
  }

  /** Advances a turn; returns the state reached when a turn completes in this step. */
  step(dt: number): 'locked' | 'open' | null {
    if (!this.turning) return null;
    this.elapsed += dt;
    if (this.elapsed < this.turn_s()) return null;
    this.state = this.state === 'locking' ? 'locked' : 'open';
    return this.state;
  }
}

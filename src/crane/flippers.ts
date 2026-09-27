// Four flippers moved together: up (0) or down (1), a full swing in flipperTime_s.

export class Flippers {
  /** 0 = up, 1 = down. */
  position = 0;
  /** Commanded down. */
  down = false;

  constructor(private readonly swing_s: () => number) {}

  toggle(): void {
    this.down = !this.down;
  }

  step(dt: number): void {
    const target = this.down ? 1 : 0;
    const travel = dt / this.swing_s();
    const d = target - this.position;
    this.position = Math.abs(d) <= travel ? target : this.position + Math.sign(d) * travel;
  }

  get fullyDown(): boolean {
    return this.position === 1;
  }
}

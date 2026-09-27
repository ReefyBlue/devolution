// One drive axis (gantry, trolley, hoist): ramped velocity towards the operator's command,
// slowdown zones before each end stop, a braking guard that can always stop in time, and a final clamp.

export interface DriveParams {
  /** Nominal maximum speed, m/s. */
  maxSpeed: number;
  /** Acceleration limit, m/s². */
  accel: number;
  /** Deceleration limit, m/s². */
  decel: number;
  /** Creep speed as a fraction of the current maximum. */
  creepFraction: number;
  /** Slowdown zone length before the upper / lower end stop, m (0 = no zone). */
  zoneAtMax: number;
  zoneAtMin: number;
  /** Speed cap inside a slowdown zone, as a fraction of the nominal maximum speed. */
  zoneCapFraction: number;
}

export interface AxisTravel {
  min: number;
  max: number;
}

export interface AxisCommand {
  /** Operator command −1 … +1. */
  demand: number;
  creep: boolean;
  /** Extra speed cap, e.g. load-dependent hoist speed or an interlock (m/s). */
  speedCap?: number;
  /**
   * Anti-sway correction added to the speed reference, m/s. The ramp then applies its rate of change,
   * so the drive feels it as an extra acceleration within its accel limit.
   */
  speedOffset?: number;
  /** Deceleration limit for this step instead of the drive's own (slack-rope stop), m/s². */
  decel?: number;
  /** Travel limits that apply this step if narrower than the hard stops (e.g. boom interlock). */
  travel?: AxisTravel;
}

export class RampedAxis {
  velocity = 0;
  /** Acceleration applied in the last step, m/s². */
  acceleration = 0;
  /** True when the last step ended on an end stop (limit switch). */
  atLimit = false;

  constructor(
    readonly params: DriveParams,
    readonly travel: AxisTravel,
    public position: number,
  ) {}

  step(dt: number, cmd: AxisCommand): void {
    const p = this.params;
    const lo = Math.max(this.travel.min, cmd.travel?.min ?? -Infinity);
    const hi = Math.min(this.travel.max, cmd.travel?.max ?? Infinity);
    const vMax = Math.min(p.maxSpeed, cmd.speedCap ?? Infinity);
    const operator = clampUnit(cmd.demand) * vMax * (cmd.creep ? p.creepFraction : 1);
    let target = clampAbs(operator + (cmd.speedOffset ?? 0), p.maxSpeed);

    // Braking guard: the highest speed that still stops before each end.
    const guardUp = brakingSpeed(hi - this.position, p.decel, dt);
    const guardDown = brakingSpeed(this.position - lo, p.decel, dt);
    // Slowdown zones (pre-limit switches), evaluated one step ahead, cap the target; the ramp then slows down.
    const next = this.position + this.velocity * dt;
    const zoneCap = p.zoneCapFraction * p.maxSpeed;
    const upCap = p.zoneAtMax > 0 && hi - next < p.zoneAtMax ? Math.min(guardUp, zoneCap) : guardUp;
    const downCap = p.zoneAtMin > 0 && next - lo < p.zoneAtMin ? Math.min(guardDown, zoneCap) : guardDown;
    target = Math.min(upCap, Math.max(-downCap, target));

    // Ramp towards the target within the accel / decel limits.
    const slowingDown = Math.abs(target) < Math.abs(this.velocity) || Math.sign(target) === -Math.sign(this.velocity);
    const limit = slowingDown ? (cmd.decel ?? p.decel) : p.accel;
    let v = this.velocity + clampAbs((target - this.velocity) / dt, limit) * dt;

    // The braking guard is absolute: never faster than what still stops before an end.
    v = Math.min(guardUp, Math.max(-guardDown, v));
    const a = (v - this.velocity) / dt;

    let pos = this.position + v * dt;
    this.atLimit = false;
    if (pos >= hi) {
      pos = hi;
      if (v > 0) v = 0;
      this.atLimit = true;
    } else if (pos <= lo) {
      pos = lo;
      if (v < 0) v = 0;
      this.atLimit = true;
    }
    this.position = pos;
    this.velocity = v;
    this.acceleration = a;
  }

  /** Immediate stop without ramp (only for resets, never during operation). */
  reset(position: number): void {
    this.position = position;
    this.velocity = 0;
    this.acceleration = 0;
    this.atLimit = false;
  }
}

/**
 * Highest speed from which a drive decelerating at `decel` in steps of `dt` still stops within `distance`:
 * v·dt + v²/(2·decel) ≤ distance.
 */
export function brakingSpeed(distance: number, decel: number, dt: number): number {
  if (distance <= 0) return 0;
  const ad = decel * dt;
  return -ad + Math.sqrt(ad * ad + 2 * decel * distance);
}

const clampUnit = (v: number): number => Math.min(1, Math.max(-1, v));
const clampAbs = (v: number, limit: number): number => Math.min(limit, Math.max(-limit, v));

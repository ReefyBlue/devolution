// Two planar pendulums (trolley axis and gantry axis) hung from the trolley sheaves.
// The four parallel rope falls make the load translate, so the period depends on the rope fall ℓ only:
//   θ̈ = (−g·sin θ − a_p·cos θ − 2·ℓ̇·θ̇ + (F_w/m)·cos θ) / ℓ − c·θ̇

import { GRAVITY } from '../core/units';

export interface SwayAxis {
  /** Rope angle from vertical, rad; positive = load displaced towards +axis. */
  angle: number;
  /** Angular rate, rad/s. */
  rate: number;
}

export interface SwayInput {
  /** Rope fall at the start of the step, m. */
  length: number;
  /** Rate of change of the rope fall, m/s (positive = paying out). */
  lengthRate: number;
  /** Pivot (trolley sheave) acceleration along the trolley axis (+ = waterside) and the gantry axis (+X), m/s². */
  pivotAccelTrolley: number;
  pivotAccelGantry: number;
  /** Wind force divided by the suspended mass, per axis, m/s². */
  windAccelTrolley: number;
  windAccelGantry: number;
  /** Damping: natural losses plus rope anti-sway when active, 1/s. */
  damping: number;
}

export interface SwayLimits {
  substeps: number;
  minLength: number;
  maxAngle: number;
}

export class SwayModel {
  readonly trolley: SwayAxis = { angle: 0, rate: 0 };
  readonly gantry: SwayAxis = { angle: 0, rate: 0 };

  constructor(readonly limits: SwayLimits) {}

  step(dt: number, input: SwayInput): void {
    const n = Math.max(1, Math.round(this.limits.substeps));
    const h = dt / n;
    for (let k = 0; k < n; k++) {
      const len = Math.max(this.limits.minLength, input.length + input.lengthRate * k * h);
      this.integrate(this.trolley, h, len, input.lengthRate, input.pivotAccelTrolley, input.windAccelTrolley, input.damping);
      this.integrate(this.gantry, h, len, input.lengthRate, input.pivotAccelGantry, input.windAccelGantry, input.damping);
    }
  }

  private integrate(ax: SwayAxis, h: number, len: number, lenRate: number, pivotAccel: number, windAccel: number, c: number): void {
    const s = Math.sin(ax.angle);
    const co = Math.cos(ax.angle);
    const alpha = (-GRAVITY * s - pivotAccel * co - 2 * lenRate * ax.rate + windAccel * co) / len - c * ax.rate;
    ax.rate += alpha * h; // semi-implicit Euler: rate first, then angle
    ax.angle += ax.rate * h;
    const max = this.limits.maxAngle;
    if (Math.abs(ax.angle) > max) {
      ax.angle = Math.sign(ax.angle) * max;
      ax.rate = 0;
    }
  }

  /** Landed: the ropes go slack and the load stops swinging. */
  ground(): void {
    this.trolley.angle = this.trolley.rate = 0;
    this.gantry.angle = this.gantry.rate = 0;
  }

  /** Lift-off from a landed position: the pendulum starts from the real offset between sheaves and load. */
  liftOff(offsetTrolley: number, offsetGantry: number, length: number): void {
    this.hold('trolley', offsetTrolley, length);
    this.hold('gantry', offsetGantry, length);
  }

  /** Holds one axis at a horizontal load offset (m), at rest: lift-off, or flippers guiding the spreader. */
  hold(axis: 'trolley' | 'gantry', offset: number, length: number): void {
    const len = Math.max(this.limits.minLength, length);
    const max = this.limits.maxAngle;
    this[axis].angle = Math.min(max, Math.max(-max, Math.asin(clampUnit(offset / len))));
    this[axis].rate = 0;
  }

  /** Horizontal load offsets from the sheaves (m) for a given rope fall. */
  offsets(length: number): { trolley: number; gantry: number } {
    return { trolley: length * Math.sin(this.trolley.angle), gantry: length * Math.sin(this.gantry.angle) };
  }

  /** Height the load rises by through the swing, m (0 when hanging straight). */
  rise(length: number): number {
    const st = Math.sin(this.trolley.angle);
    const sg = Math.sin(this.gantry.angle);
    return length * (1 - Math.sqrt(Math.max(0, 1 - st * st - sg * sg)));
  }
}

const clampUnit = (v: number): number => Math.min(1, Math.max(-1, v));

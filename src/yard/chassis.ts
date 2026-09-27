// A terminal tractor with a 20/40 combo chassis waiting in a truck lane under the crane.

import type { SizeFt } from '../sim/container';

export type ChassisPosition = 'front' | 'centre' | 'rear';

/** Offset of a single 20 ft slot from the chassis centre: half of 12.192 minus half of 6.058, plus half the 76 mm gap. */
const TWENTY_FT_SLOT_OFFSET_M = 3.067;

export class Chassis {
  /** Ids of the boxes on the bed. */
  readonly load: string[] = [];
  /** Simulation time at which the tractor drives off with its box, or null. */
  departAt: number | null = null;

  constructor(
    readonly laneId: string,
    /** World X of the chassis centre (aligned under the crane) and world Z of the lane centreline. */
    readonly x: number,
    readonly z: number,
    readonly bedTop: number,
    readonly length: number,
    /** Driving direction along world X: +1 or −1; the front (tractor end) faces it. */
    readonly direction: 1 | -1,
  ) {}

  /** World X of a cone position for a box of the given size. */
  slotX(size: SizeFt, position: ChassisPosition): number {
    if (size !== 20 || position === 'centre') return this.x;
    const sign = position === 'front' ? 1 : -1;
    return this.x + this.direction * sign * TWENTY_FT_SLOT_OFFSET_M;
  }

  /** Nearest cone position for a box landed at world X. */
  nearestPosition(size: SizeFt, x: number): ChassisPosition {
    if (size !== 20) return 'centre';
    const options: ChassisPosition[] = ['front', 'centre', 'rear'];
    return options.reduce((best, p) => (Math.abs(this.slotX(size, p) - x) < Math.abs(this.slotX(size, best) - x) ? p : best));
  }
}

// Headblock + spreader (+ box) on the rope falls: where the load would be this step (the candidate pose),
// resting where it landed until the ropes lift it again, and lift-off with the real offset.

import type { SwayModel } from './swayModel';

/** Load pose: centre of the twistlock plane, along world X, fromWatersideRail_m and height above the apron. */
export interface LoadPose {
  x: number;
  fwr: number;
  y: number;
}

/** The trolley sheaves the load hangs from: world X and fromWatersideRail_m. */
export interface Pivot {
  x: number;
  fwr: number;
}

export class LoadSuspension {
  /** Actual pose after the landing clamp. */
  pose: LoadPose;
  /** Where the load stands while landed; null while it hangs free. */
  rest: { x: number; fwr: number } | null = null;

  constructor(start: LoadPose) {
    this.pose = { ...start };
  }

  /**
   * Candidate pose from the rope height: hanging, it follows the swing; landed, it stays where it stands until
   * the ropes lift it (dragged along only when the ropes would lean past the sway model's angle limit).
   */
  candidate(sway: SwayModel, pivot: Pivot, ropeHeight: number, ropeFall: number): LoadPose {
    if (this.rest) {
      const reach = ropeFall * Math.sin(sway.limits.maxAngle);
      this.rest.x = pivot.x + clampAbs(this.rest.x - pivot.x, reach);
      this.rest.fwr = pivot.fwr + clampAbs(this.rest.fwr - pivot.fwr, reach);
      // Paying out below the resting height only slackens the ropes.
      return { x: this.rest.x, fwr: this.rest.fwr, y: Math.max(ropeHeight, this.pose.y) };
    }
    const off = sway.offsets(ropeFall);
    return { x: pivot.x + off.gantry, fwr: pivot.fwr + off.trolley, y: ropeHeight + sway.rise(ropeFall) };
  }

  /**
   * Applies the clamped height. Landed: the load rests and stops swinging; returns the downward speed at
   * first contact. Lifted: the swing starts from the offset between sheaves and load.
   */
  settle(candidate: LoadPose, clampedY: number, landed: boolean, sway: SwayModel, pivot: Pivot, ropeFall: number, dt: number): number | null {
    let contactSpeed: number | null = null;
    if (landed) {
      if (!this.rest) {
        contactSpeed = (this.pose.y - candidate.y) / dt;
        this.rest = { x: candidate.x, fwr: candidate.fwr };
      }
      sway.ground();
    } else if (this.rest) {
      sway.liftOff(this.rest.fwr - pivot.fwr, this.rest.x - pivot.x, ropeFall);
      this.rest = null;
    }
    this.pose = { x: candidate.x, fwr: candidate.fwr, y: clampedY };
    return contactSpeed;
  }
}

const clampAbs = (v: number, limit: number): number => Math.min(limit, Math.max(-limit, v));

// Flippers down: over the last flipperCaptureHeight_m above a box of the spreader's length, a spreader within
// ±flipperCapture_m of it is funnelled into line; the misalignment allowed shrinks to zero at touch-down.

import type { Profiles } from '../config/profiles';
import { boxDims } from '../sim/container';
import type { World } from '../sim/world';
import type { LoadPose, Pivot } from './loadSuspension';
import type { SwayModel } from './swayModel';

export function guideByFlippers(cand: LoadPose, world: World, profiles: Profiles, castingLength: number, sway: SwayModel, pivot: Pivot, ropeFall: number): void {
  const sp = profiles.spreader;
  if (sp.flipperCaptureHeight_m <= 0) return;
  for (const box of world.containers) {
    if (box.location.kind === 'spreader') continue;
    const d = boxDims(box, profiles.containers);
    const h = cand.y - (box.y + d.height);
    if (h < 0 || h > sp.flipperCaptureHeight_m || Math.abs(d.castingLength - castingLength) > 1e-3) continue;
    const boxFwr = world.frame.fromWatersideRail(box.z);
    const dx = cand.x - box.x;
    const df = cand.fwr - boxFwr;
    if (Math.abs(dx) > sp.flipperCapture_m || Math.abs(df) > sp.flipperCapture_m) continue;
    const allowed = (sp.flipperCapture_m * h) / sp.flipperCaptureHeight_m;
    if (Math.abs(dx) > allowed) {
      cand.x = box.x + Math.sign(dx) * allowed;
      sway.hold('gantry', cand.x - pivot.x, ropeFall);
    }
    if (Math.abs(df) > allowed) {
      cand.fwr = boxFwr + Math.sign(df) * allowed;
      sway.hold('trolley', cand.fwr - pivot.fwr, ropeFall);
    }
    return;
  }
}

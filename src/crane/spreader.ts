// The spreader: telescope, twistlocks and flippers, with the lock and unlock interlocks.

import type { Profiles } from '../config/profiles';
import { boxDims, type Container } from '../sim/container';
import { CORNERS } from '../sim/craneView';
import type { World } from '../sim/world';
import { Flippers } from './flippers';
import { allLanded, type Landing } from './landing';
import { Telescope } from './telescope';
import { Twistlocks } from './twistlocks';

export class Spreader {
  readonly telescope: Telescope;
  readonly twistlocks: Twistlocks;
  readonly flippers: Flippers;

  constructor(private readonly profiles: Profiles) {
    this.telescope = new Telescope(profiles);
    this.twistlocks = new Twistlocks(() => profiles.spreader.twistlockTurn_s);
    this.flippers = new Flippers(() => profiles.spreader.flipperTime_s);
  }

  /**
   * Lock interlock: all four corners seated on the castings of one box, the telescope at that box's length,
   * and the twistlocks within the casting capture of the holes. Returns the box, or why not.
   */
  lockTarget(landing: Landing, world: World, centre: { x: number; z: number }): Container | string {
    if (!allLanded(landing)) return 'NOT LANDED';
    const ids = new Set(CORNERS.map((c) => landing.surfaces[c]?.containerId ?? ''));
    const [id] = ids;
    const box = ids.size === 1 && id ? world.container(id) : undefined;
    if (!box) return 'NOT ON ONE BOX';
    if (this.telescope.moving || Math.abs(this.telescope.length - boxDims(box, this.profiles.containers).castingLength) > 1e-3) return 'SPREADER SIZE';
    const capture = this.profiles.spreader.castingCapture_m;
    if (Math.abs(centre.x - box.x) > capture || Math.abs(centre.z - box.z) > capture) return 'NOT ALIGNED';
    return box;
  }
}

import { describe, expect, it } from 'vitest';
import { loadProfiles } from '../../src/config/profiles';
import { FIXED_DT } from '../../src/core/fixedStep';
import { knotsToMps } from '../../src/core/units';
import { WindField } from '../../src/core/wind';
import { windForce } from '../../src/crane/windLoad';
import { World } from '../../src/sim/world';

describe('wind', () => {
  it('pushes 20 kn on the long side of a 40 ft box with about 2.5 kN', () => {
    const f = windForce({ alongX: 0, towardsWater: knotsToMps(20) }, { side: 12.192 * 2.591, end: 2.438 * 2.591 }, 1.2);
    expect(f.trolley).toBeGreaterThan(2400);
    expect(f.trolley).toBeLessThan(2500);
    expect(f.gantry).toBe(0);
  });

  it('gusts rise and fall between the mean and the gust speed', () => {
    const { profiles, scene } = loadProfiles();
    Object.assign(scene.wind, { speed_kn: 20, gustSpeed_kn: 27, gustIntervalMin_s: 10, gustIntervalMax_s: 20 });
    const wind = new WindField(scene.wind, new World(scene, profiles).frame);
    let lo = Infinity;
    let hi = 0;
    for (let t = 0; t < 300; t += FIXED_DT) {
      wind.step(FIXED_DT);
      lo = Math.min(lo, wind.speed);
      hi = Math.max(hi, wind.speed);
    }
    expect(lo).toBeGreaterThanOrEqual(knotsToMps(20) - 1e-9);
    expect(hi).toBeLessThanOrEqual(knotsToMps(27) + 1e-9);
    expect(hi).toBeGreaterThan(knotsToMps(25));
  });
});

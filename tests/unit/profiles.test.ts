import { describe, expect, it } from 'vitest';
import crane from '../../config/crane-SPP-65.json';
import { loadProfiles, ProfileError } from '../../src/config/profiles';
import { PROFILE_SPECS } from '../../src/config/profileSpecs';
import { check } from '../../src/config/spec';

describe('profiles', () => {
  it('load with the approved defaults', () => {
    const { profiles, scene } = loadProfiles();
    expect(profiles.crane.outreach_m).toBe(65);
    expect(profiles.trolley.maxSpeed_mps * 60).toBe(240);
    expect(profiles.gantry.maxSpeed_mps * 60).toBe(45);
    expect(profiles.hoist.ratedSpeed_mps * 60).toBe(90);
    expect(profiles.hoist.emptySpeed_mps * 60).toBe(180);
    expect(scene.testMoves.length).toBe(4);
  });

  it('report a wrong value, a missing field and an unknown field with the file name', () => {
    const bad: Record<string, unknown> = { ...crane, outreach_m: 500, typo_m: 1 };
    delete bad.backreach_m;
    const problems = check(PROFILE_SPECS.crane, bad, 'crane-SPP-65.json');
    expect(problems).toContain('crane-SPP-65.json: unknown field "typo_m"');
    expect(problems).toContain('crane-SPP-65.json: missing field "backreach_m"');
    expect(problems).toContain('crane-SPP-65.json.outreach_m: 500 is outside 20 … 90');
  });

  it('refuse to start with inconsistent values', () => {
    const { profiles } = loadProfiles();
    const raw = { ...profiles, hud: { ...profiles.hud, swayRed_m: 0.05 } };
    expect(() => loadProfiles(raw)).toThrow(ProfileError);
  });
});

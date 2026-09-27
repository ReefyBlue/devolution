// Loads and checks the JSON tuning profiles. Every problem is listed; the app shows them instead of starting.

import audio from '../../config/audio.json';
import boom from '../../config/boom.json';
import camera from '../../config/camera.json';
import containers from '../../config/containers.json';
import controls from '../../config/controls.json';
import crane from '../../config/crane-SPP-65.json';
import gantry from '../../config/drive-gantry.json';
import trolley from '../../config/drive-trolley.json';
import hoist from '../../config/hoist.json';
import hud from '../../config/hud.json';
import palette from '../../config/operator-palette.json';
import rules from '../../config/rules-defaults.json';
import spreader from '../../config/spreader.json';
import sway from '../../config/sway.json';
import testScene from '../../config/test-scene.json';
import { PROFILE_SPECS, type ProfileName } from './profileSpecs';
import { check, type Value } from './spec';
import { TEST_SCENE_SPEC } from './testSceneSpec';

export type Profiles = { [K in ProfileName]: Value<(typeof PROFILE_SPECS)[K]> };
export type TestScene = Value<typeof TEST_SCENE_SPEC>;

/** File name of each profile in config/, used for messages and the tuning panel's export. */
export const PROFILE_FILES: Record<ProfileName, string> = {
  crane: 'crane-SPP-65.json',
  gantry: 'drive-gantry.json',
  trolley: 'drive-trolley.json',
  hoist: 'hoist.json',
  boom: 'boom.json',
  spreader: 'spreader.json',
  sway: 'sway.json',
  containers: 'containers.json',
  palette: 'operator-palette.json',
  camera: 'camera.json',
  hud: 'hud.json',
  audio: 'audio.json',
  rules: 'rules-defaults.json',
  controls: 'controls.json',
};

const RAW: Record<ProfileName, unknown> = {
  crane, gantry, trolley, hoist, boom, spreader, sway, containers, palette, camera, hud, audio, rules, controls,
};

export class ProfileError extends Error {
  constructor(readonly problems: string[]) {
    super(`QuayOps configuration has ${problems.length} problem(s):\n${problems.join('\n')}`);
  }
}

/** Checks raw profile data; returns typed copies (safe to tune at run time) or throws with every problem. */
export function loadProfiles(raw: Record<ProfileName, unknown> = RAW, rawScene: unknown = testScene): { profiles: Profiles; scene: TestScene } {
  const names = Object.keys(PROFILE_SPECS) as ProfileName[];
  const problems = names.flatMap((n) => check(PROFILE_SPECS[n], raw[n], PROFILE_FILES[n]));
  problems.push(...check(TEST_SCENE_SPEC, rawScene, 'test-scene.json'));
  if (problems.length > 0) throw new ProfileError(problems);
  const profiles = structuredClone(raw) as Profiles;
  const scene = structuredClone(rawScene) as TestScene;
  const cross = crossChecks(profiles, scene);
  if (cross.length > 0) throw new ProfileError(cross);
  return { profiles, scene };
}

/** Rules that span fields or files. */
function crossChecks(p: Profiles, s: TestScene): string[] {
  const out: string[] = [];
  if (p.hud.swayRed_m <= p.hud.swayAmber_m) out.push('hud.json: swayRed_m must be above swayAmber_m');
  if (p.hoist.emptySpeed_mps < p.hoist.ratedSpeed_mps) out.push('hoist.json: emptySpeed_mps must not be below ratedSpeed_mps');
  if (p.crane.boomParkTrolley_m >= p.crane.boomHingeFromWatersideRail_m) {
    out.push('crane-SPP-65.json: boomParkTrolley_m must lie landside of boomHingeFromWatersideRail_m');
  }
  if (s.wind.gustIntervalMin_s > s.wind.gustIntervalMax_s) out.push('test-scene.json: wind.gustIntervalMin_s is above gustIntervalMax_s');
  s.deckStack.weightByTier_t.forEach((w, i) => {
    if (w.min > w.max) out.push(`test-scene.json: deckStack.weightByTier_t[${i}] min is above max`);
  });
  s.deckStack.bays.forEach((b, i) => {
    if (b.tiers.length > s.vessel.bays.tiersOnDeck) out.push(`test-scene.json: deckStack.bays[${i}] has more tiers than the vessel's tiersOnDeck`);
    if (b.tiers.length > s.deckStack.weightByTier_t.length) out.push(`test-scene.json: deckStack.bays[${i}] needs a weightByTier_t entry per tier`);
  });
  for (const op of s.deckStack.operators) {
    if (!p.palette.operators[op]) out.push(`test-scene.json: deckStack operator "${op}" is not in operator-palette.json`);
  }
  return out;
}

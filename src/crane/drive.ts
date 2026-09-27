// Converts a drive profile (config/drive-*.json) into ramped-axis parameters.

import type { Profiles } from '../config/profiles';
import type { DriveParams } from '../core/rampedAxis';

/** Below this speed a drive counts as stopped (interlocks, gantry bell), m/s. */
export const STOPPED_MPS = 0.005;

export function driveParams(p: Profiles['gantry']): DriveParams {
  return {
    maxSpeed: p.maxSpeed_mps,
    accel: p.accel_mps2,
    decel: p.decel_mps2,
    creepFraction: p.creepFraction,
    zoneAtMax: p.endZone_m,
    zoneAtMin: p.endZone_m,
    zoneCapFraction: p.zoneCapFraction,
  };
}

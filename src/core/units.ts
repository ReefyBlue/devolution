// Physical constants, unit conversions and HUD number formatting.

export const GRAVITY = 9.81; // m/s²
export const AIR_DENSITY = 1.225; // kg/m³ at sea level
const MPS_PER_KNOT = 1852 / 3600;

export const knotsToMps = (kn: number): number => kn * MPS_PER_KNOT;
export const mpsToKnots = (mps: number): number => mps / MPS_PER_KNOT;
export const mpsToMmin = (mps: number): number => mps * 60;
export const tonnesToKg = (t: number): number => t * 1000;
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Trolley or lane position as the HUD shows it: "WS 32.4 m" (waterside) or "LS 12.0 m" (landside). */
export function formatFromWatersideRail(m: number): string {
  const side = m >= 0 ? 'WS' : 'LS';
  return `${side} ${Math.abs(m).toFixed(1)} m`;
}

/** Signed value with one decimal and an explicit sign, e.g. "+12.4". */
export function formatSigned(v: number, digits = 1): string {
  const s = v.toFixed(digits);
  return v >= 0 && !s.startsWith('-') ? `+${s}` : s.replace('-', '−');
}

/** mm:ss for move timers. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

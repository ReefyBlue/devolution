// Things the crane reports once, for the HUD, the sounds and the test hooks.

export type CraneEvent =
  | { kind: 'landed'; speed: number; hard: boolean }
  | { kind: 'refused'; action: 'lock' | 'unlock' | 'telescope'; reason: string }
  | { kind: 'twistlocks'; locked: boolean }
  | { kind: 'placed'; boxId: string; label: string; dx_cm: number; dz_cm: number; yaw_deg: number }
  | { kind: 'cleared'; boxId: string; laneId: string };

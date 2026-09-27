import { describe, expect, it } from 'vitest';
import { maxHoistSpeed } from '../../src/crane/hoistSpeed';
import { SwayModel } from '../../src/crane/swayModel';
import { GRAVITY } from '../../src/core/units';

const DT = 0.02;
const limits = { substeps: 4, minLength: 0.5, maxAngle: (25 * Math.PI) / 180 };
const still = { lengthRate: 0, pivotAccelTrolley: 0, pivotAccelGantry: 0, windAccelTrolley: 0, windAccelGantry: 0, damping: 0 };

/** Swings a small free oscillation and measures the period from zero crossings. */
function measuredPeriod(length: number): number {
  const sway = new SwayModel(limits);
  sway.trolley.angle = 0.01;
  const crossings: number[] = [];
  let prev = sway.trolley.angle;
  for (let t = DT; t < 120; t += DT) {
    sway.step(DT, { ...still, length });
    const a = sway.trolley.angle;
    if (prev > 0 && a <= 0) crossings.push(t - DT + (DT * prev) / (prev - a));
    prev = a;
  }
  const first = crossings[0] ?? 0;
  const last = crossings[crossings.length - 1] ?? 0;
  return (last - first) / (crossings.length - 1);
}

/** Rope fall for a hoist height: sheave axis 53.5 m, headblock sheave 2.6 m above the twistlock plane. */
const ropeFall = (hoistHeight: number): number => 53.5 - hoistHeight - 2.6;

describe('SwayModel', () => {
  it('swings with the period 2π√(ℓ/g) at hoist +30 m (9.17 s) and +12 m (12.51 s)', () => {
    for (const [height, expected] of [[30, 9.17], [12, 12.51]] as const) {
      const period = measuredPeriod(ropeFall(height));
      expect(period).toBeCloseTo(2 * Math.PI * Math.sqrt(ropeFall(height) / GRAVITY), 1);
      expect(Math.abs(period - expected) / expected).toBeLessThan(0.01);
    }
  });

  it('builds about 9° of sway from 5 s of full trolley acceleration at hoist +30 m', () => {
    const sway = new SwayModel(limits);
    const length = ropeFall(30);
    for (let t = 0; t < 5; t += DT) sway.step(DT, { ...still, length, pivotAccelTrolley: 0.8 });
    let peak = 0;
    for (let t = 0; t < 20; t += DT) {
      sway.step(DT, { ...still, length });
      peak = Math.max(peak, Math.abs(sway.trolley.angle));
    }
    expect((peak * 180) / Math.PI).toBeGreaterThan(8.5);
    expect((peak * 180) / Math.PI).toBeLessThan(9.4);
  });

  it('decays under damping (electronic anti-sway acts like c = k)', () => {
    const sway = new SwayModel(limits);
    sway.trolley.angle = (9 * Math.PI) / 180;
    const length = ropeFall(30);
    for (let t = 0; t < 9.2; t += DT) sway.step(DT, { ...still, length, damping: 0.6 });
    expect(Math.abs(sway.trolley.angle)).toBeLessThan((1 * Math.PI) / 180);
  });

  it('holds a steady wind offset of ℓ·F/(m·g)', () => {
    const sway = new SwayModel(limits);
    const length = ropeFall(30);
    const windAccel = 2459 / 18_750; // 20 kn on a 40 ft side, empty box + spreader + headblock
    for (let t = 0; t < 400; t += DT) sway.step(DT, { ...still, length, windAccelTrolley: windAccel, damping: 0.05 });
    expect(sway.offsets(length).trolley).toBeCloseTo(0.28, 2);
  });

  it('lifts off from a landed offset with the matching angle', () => {
    const sway = new SwayModel(limits);
    sway.liftOff(0.5, 0, 20);
    expect(sway.offsets(20).trolley).toBeCloseTo(0.5, 6);
  });
});

describe('hoist speed', () => {
  const p = { ratedSpeed: 1.5, emptySpeed: 3.0, ratedLoad_t: 65, suspendedTare_t: 15 };
  it('follows the constant-power curve: 180 / 158 / 131 / 111 / 90 m/min', () => {
    expect(maxHoistSpeed(p, 0) * 60).toBeCloseTo(180, 0);
    expect(maxHoistSpeed(p, 30.48) * 60).toBeCloseTo(158.3, 0);
    expect(maxHoistSpeed(p, 40) * 60).toBeCloseTo(130.9, 0);
    expect(maxHoistSpeed(p, 50) * 60).toBeCloseTo(110.8, 0);
    expect(maxHoistSpeed(p, 65) * 60).toBeCloseTo(90, 6);
  });
});

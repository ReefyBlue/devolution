import { describe, expect, it } from 'vitest';
import { type DriveParams, RampedAxis } from '../../src/core/rampedAxis';

const DT = 0.02;
const trolley: DriveParams = {
  maxSpeed: 4.0,
  accel: 0.8,
  decel: 0.8,
  creepFraction: 0.1,
  zoneAtMax: 12,
  zoneAtMin: 12,
  zoneCapFraction: 0.2,
};
const travel = { min: -50.48, max: 65 };

/** Drives full demand towards the upper stop and records the run. */
function runToStop(params: DriveParams, start: number, seconds: number) {
  const axis = new RampedAxis(params, travel, start);
  const samples: { pos: number; v: number; a: number }[] = [];
  for (let t = 0; t < seconds; t += DT) {
    axis.step(DT, { demand: 1, creep: false });
    samples.push({ pos: axis.position, v: axis.velocity, a: axis.acceleration });
  }
  return { axis, samples };
}

describe('RampedAxis', () => {
  it('ramps up at the accel limit and holds the maximum speed', () => {
    const axis = new RampedAxis(trolley, travel, -40);
    for (let i = 0; i < 50; i++) axis.step(DT, { demand: 1, creep: false });
    expect(axis.velocity).toBeCloseTo(0.8, 6); // 1 s at 0.8 m/s²
    for (let i = 0; i < 400; i++) axis.step(DT, { demand: 1, creep: false });
    expect(axis.velocity).toBeCloseTo(4.0, 6);
  });

  it('never exceeds the accel limit, never overruns the stop and crawls into it', () => {
    const { axis, samples } = runToStop(trolley, -40, 60);
    const maxAccel = Math.max(...samples.map((s) => Math.abs(s.a)));
    expect(maxAccel).toBeLessThanOrEqual(0.8 * 1.001);
    expect(Math.max(...samples.map((s) => s.pos))).toBeLessThanOrEqual(65);
    expect(axis.position).toBeCloseTo(65, 3);
    expect(axis.atLimit).toBe(true);
    // Past zone entry + braking distance (9.6 m) the speed stays at or below the 20 % cap.
    const capped = samples.filter((s) => s.pos > 65 - 12 + 9.6 + 0.2);
    expect(capped.length).toBeGreaterThan(0);
    expect(Math.max(...capped.map((s) => s.v))).toBeLessThanOrEqual(0.8 + 1e-9);
  });

  it('stops at the lower end the same way', () => {
    const axis = new RampedAxis(trolley, travel, 50);
    let minPos = Infinity;
    for (let t = 0; t < 60; t += DT) {
      axis.step(DT, { demand: -1, creep: false });
      minPos = Math.min(minPos, axis.position);
    }
    expect(minPos).toBeGreaterThanOrEqual(-50.48);
    expect(axis.position).toBeCloseTo(-50.48, 3);
  });

  it('creeps at 10 % of the maximum speed', () => {
    const axis = new RampedAxis(trolley, travel, 0);
    for (let i = 0; i < 200; i++) axis.step(DT, { demand: 1, creep: true });
    expect(axis.velocity).toBeCloseTo(0.4, 6);
  });

  it('respects a narrower interlock limit without an instant stop', () => {
    const axis = new RampedAxis(trolley, travel, -40);
    let maxPos = -Infinity;
    for (let t = 0; t < 30; t += DT) {
      axis.step(DT, { demand: 1, creep: false, travel: { min: -50.48, max: -6 } });
      maxPos = Math.max(maxPos, axis.position);
      expect(Math.abs(axis.acceleration)).toBeLessThanOrEqual(0.8 * 1.001);
    }
    expect(maxPos).toBeLessThanOrEqual(-6);
  });

  it('adds anti-sway acceleration within the limit', () => {
    const axis = new RampedAxis(trolley, travel, 0);
    axis.step(DT, { demand: 0, creep: false, extraAccel: 5 });
    expect(axis.acceleration).toBeCloseTo(0.8, 6);
  });
});

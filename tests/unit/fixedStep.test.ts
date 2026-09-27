import { describe, expect, it } from 'vitest';
import { FIXED_DT, FixedStepClock } from '../../src/core/fixedStep';

describe('FixedStepClock', () => {
  it('runs whole 0.02 s steps and keeps the remainder for interpolation', () => {
    const clock = new FixedStepClock();
    expect(clock.dt).toBe(FIXED_DT);
    expect(clock.advance(0.05)).toBe(2);
    expect(clock.alpha).toBeCloseTo(0.5, 9);
    expect(clock.advance(0.01)).toBe(1);
    expect(clock.alpha).toBeCloseTo(0, 9);
  });

  it('drops long pauses instead of catching up', () => {
    const clock = new FixedStepClock();
    expect(clock.advance(2)).toBe(5);
  });
});

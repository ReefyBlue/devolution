import { test, expect, type Page } from '@playwright/test';
import { advance, deadzone, openApp, state, type State } from './helpers';

// Phase 1 smoke run: the first test move, 14-02-88 → L1 centre, through the real input path.
// The trolley runs on the virtual gamepad's left stick; hoist, lock, flippers and anti-sway on the keyboard.

const step = (name: string) => console.info(`PASS  ${name}`);

/** Saves a review image from one of the fixed viewpoints (tests/screenshots/, not committed). */
async function shot(page: Page, view: string, name: string): Promise<void> {
  await page.evaluate(`window.__quayops.setView('${view}')`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `tests/screenshots/${name}.png` });
}
const allLanded = (s: State) => Object.values(s.spreader.landed).every(Boolean);

/**
 * One smooth trolley move on the analogue stick: speed ramps up over one sway period and down over one
 * period, so the load arrives without swinging. Runs inside the page, one simulation step at a time.
 */
async function shapedMove(page: Page, distance: number): Promise<void> {
  await page.evaluate(
    ({ distance, deadzone }) => {
      const w = window as unknown as {
        __testPad: { axes: number[] };
        __quayops: { advance: (s: number) => void; state: () => { ropeFall: number; trolley: { maxSpeed: number } } };
      };
      const s = w.__quayops.state();
      const period = 2 * Math.PI * Math.sqrt(s.ropeFall / 9.81);
      const vMax = s.trolley.maxSpeed;
      const v = Math.min(vMax, Math.abs(distance) / period);
      const cruise = Math.abs(distance) / v - period;
      const total = 2 * period + cruise;
      for (let t = 0; t < total; t += 0.02) {
        const speed = t < period ? (v * t) / period : t < period + cruise ? v : (v * (total - t)) / period;
        // Stick up (−1) = towards the water; the app removes the deadzone and rescales.
        const demand = speed / vMax;
        w.__testPad.axes[1] = demand > 0 ? -Math.sign(distance) * (deadzone + demand * (1 - deadzone)) : 0;
        w.__quayops.advance(0.02);
      }
      w.__testPad.axes[1] = 0;
    },
    { distance, deadzone },
  );
}

/** Waits until the swing has died out and the trolley stands (anti-sway on). */
async function settle(page: Page): Promise<State> {
  for (let i = 0; i < 300; i++) {
    const s = await state(page);
    if (Math.abs(s.sway.trolley) < 0.02 && Math.abs(s.sway.gantry) < 0.02 && Math.abs(s.trolley.velocity) < 0.002) return s;
    await advance(page, 0.2);
  }
  throw new Error('the swing did not settle');
}

/** Brings the hanging load over `fwr`: smooth moves, then settle and correct. */
async function loadTo(page: Page, fwr: number): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const s = await settle(page);
    const error = fwr - s.load.fwr;
    if (Math.abs(error) < 0.03) return;
    await shapedMove(page, error);
  }
  throw new Error(`the load did not reach WS ${fwr}`);
}

/** Holds keys while advancing in small slices until the condition holds. */
async function holdUntil(page: Page, keys: string[], until: (s: State) => boolean, seconds: number): Promise<State> {
  for (const k of keys) await page.keyboard.down(k);
  let s = await state(page);
  for (let t = 0; t < seconds && !until(s); t += 0.1) {
    await advance(page, 0.1);
    s = await state(page);
  }
  for (const k of [...keys].reverse()) await page.keyboard.up(k);
  return s;
}

/** Lowers at full speed to 7 m above `height`, then creeps down until all four corners have landed. */
async function lowerOnto(page: Page, height: number): Promise<State> {
  await holdUntil(page, ['ArrowDown'], (s) => s.hoist.position < height + 7, 60);
  return holdUntil(page, ['ShiftLeft', 'ArrowDown'], allLanded, 60);
}

test('smoke run: pick 14-02-88 from the deck stack and land it on the chassis in L1', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await openApp(page);

  let s = await state(page);
  const box = s.boxes.find((b) => b.location.slot === '14-02-88');
  expect(box).toBeDefined();
  if (!box) return;
  const boxHeight = 2.896; // tier 88 in bay 14 is a 40 ft high cube
  const lane = -8.5;

  await page.keyboard.press('KeyT');
  await page.keyboard.press('KeyF');
  await advance(page, 2.2);
  s = await state(page);
  expect(s.antiSway).toBe(true);
  expect(s.spreader.flippers).toBe(1);
  step('anti-sway on, flippers down');

  await loadTo(page, -box.z);
  step(`spreader over row 02 (WS ${(-box.z).toFixed(2)} m)`);

  s = await lowerOnto(page, box.y + boxHeight);
  expect(allLanded(s)).toBe(true);
  expect(s.events.some((e) => e.kind === 'landed' && e.hard)).toBe(false);
  step('4 corners landed, soft landing');
  await shot(page, 'stack', 'pick-landed');

  await page.keyboard.press('Space');
  await advance(page, 1);
  s = await state(page);
  expect(s.spreader.lock).toBe('locked');
  expect(s.spreader.carried).toBe(box.id);
  step(`locked on ${box.id}`);

  await page.keyboard.press('KeyF');
  s = await holdUntil(page, ['ArrowUp'], (st) => st.hoist.position > 22, 30);
  expect(s.boxes.find((b) => b.id === box.id)?.location.kind).toBe('spreader');
  step('lifted clear of the stack');
  await shot(page, 'crane', 'pick-lifted');

  await loadTo(page, lane);
  step('over lane L1');

  s = await lowerOnto(page, 1.45 + boxHeight);
  expect(allLanded(s)).toBe(true);
  step('box seated on the chassis');
  await shot(page, 'lane', 'place-chassis');

  await page.keyboard.press('Space');
  await advance(page, 1);
  s = await state(page);
  expect(s.spreader.lock).toBe('open');
  const placed = s.boxes.find((b) => b.id === box.id);
  expect(placed?.location).toEqual({ kind: 'chassis', position: 'centre' });
  const report = s.events.find((e) => e.kind === 'placed');
  expect(report?.label).toBe('L1 centre');
  step(`unlocked; placed on L1 centre, Δ ${Number(report?.dx_cm).toFixed(1)} / ${Number(report?.dz_cm).toFixed(1)} cm`);

  await holdUntil(page, ['ArrowUp'], (st) => st.hoist.position > 10, 20);
  await advance(page, 5);
  s = await state(page);
  expect(s.boxes.some((b) => b.id === box.id)).toBe(false);
  step('the tractor took the box away');
  await expect(page.locator('.hud [data-f="move"]')).toHaveText('MOVE  18-04-88 ─► L1 centre');
  step('HUD shows the next test move');
  expect(errors).toEqual([]);
  console.info('SMOKE RUN: PASS');
});

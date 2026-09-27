import { test, expect, type Page } from '@playwright/test';
import { advance, openApp, state } from './helpers';

type TestPad = { axes: number[]; buttons: { pressed: boolean; value: number }[] };
const pad = (page: Page, change: (p: TestPad) => void) => page.evaluate(`(${change.toString()})(window.__testPad)`);

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('keyboard drives every axis into its limits without overrun', async ({ page }) => {
  await page.keyboard.down('KeyD');
  await advance(page, 200);
  await page.keyboard.up('KeyD');
  let s = await state(page);
  expect(s.gantry.position).toBe(s.gantry.max);
  expect(s.gantry.atLimit).toBe(true);

  await page.keyboard.down('KeyW');
  await advance(page, 40);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('ArrowDown');
  await advance(page, 40);
  await page.keyboard.up('ArrowDown');
  s = await state(page);
  expect(s.trolley.position).toBe(s.trolley.max);
  expect(s.hoist.position).toBe(s.hoist.min);

  // Boom: refused with the trolley out over the water.
  await page.keyboard.down('KeyS');
  await advance(page, 60);
  await page.keyboard.up('KeyS');
  await page.keyboard.down('ArrowUp');
  await advance(page, 40);
  await page.keyboard.up('ArrowUp');
  s = await state(page);
  expect(s.trolley.position).toBe(s.trolley.min);
  expect(s.hoist.position).toBe(s.hoist.max);
  await page.keyboard.down('KeyB');
  await page.keyboard.down('ArrowUp');
  await advance(page, 170);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('KeyB');
  s = await state(page);
  expect(s.boom.position).toBe(s.boom.max);
  expect(s.boom.latched).toBe(true);
});

test('gamepad sticks and d-pad drive trolley, hoist and gantry', async ({ page }) => {
  await pad(page, (p) => { p.axes[1] = -1; });
  await advance(page, 3);
  let s = await state(page);
  expect(s.trolley.velocity).toBeGreaterThan(0); // stick up = towards the water
  await pad(page, (p) => { p.axes[1] = 0; p.axes[3] = -1; });
  await advance(page, 2);
  s = await state(page);
  expect(s.hoist.velocity).toBeLessThan(0); // stick forward = lower
  await pad(page, (p) => { p.axes[3] = 0; p.buttons[15]!.pressed = true; });
  await advance(page, 2);
  s = await state(page);
  expect(s.gantry.velocity).toBeGreaterThan(0); // d-pad right = +X
});

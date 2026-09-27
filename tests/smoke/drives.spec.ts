import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const appUrl = pathToFileURL(resolve('dist/quayops.html')).href;

interface Drive {
  position: number;
  velocity: number;
  atLimit: boolean;
  min: number;
  max: number;
}
interface State {
  gantry: Drive;
  trolley: Drive;
  hoist: Drive;
  boom: Drive & { latched: boolean; interlock: string };
}
type Hooks = { advance: (s: number) => void; state: () => State };
type TestPad = { axes: number[]; buttons: { pressed: boolean; value: number }[] };

const hooks = 'window.__quayops';
const advance = (page: Page, s: number) => page.evaluate(`${hooks}.advance(${s})`);
const state = (page: Page) => page.evaluate(() => (window as unknown as { __quayops: Hooks }).__quayops.state());
const pad = (page: Page, change: (p: TestPad) => void) =>
  page.evaluate(`(${change.toString()})(window.__testPad)`);

// A virtual standard-mapping gamepad, so the smoke run drives the real Gamepad API path.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const testPad = { id: 'QuayOps test pad', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons };
    Object.assign(window, { __testPad: testPad });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [testPad, null, null, null] });
  });
  await page.goto(appUrl);
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
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

import { test, expect } from '@playwright/test';
import { advance, openApp, state } from './helpers';

const field = (name: string) => `.hud [data-f="${name}"]`;

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await advance(page, 0.2);
});

test('the HUD shows the crane, the move and the wind', async ({ page }) => {
  await expect(page.locator(field('title'))).toHaveText('SPP-65 · CABIN');
  await expect(page.locator(field('move'))).toHaveText('MOVE  14-02-88 ─► L1 centre');
  await expect(page.locator(field('hoist'))).toHaveText('+30.0 m');
  await expect(page.locator(field('trolley'))).toHaveText('LS 15.0 m');
  await expect(page.locator(field('gantry'))).toHaveText('169.8 m');
  await expect(page.locator(field('size'))).toHaveText("40'");
  await expect(page.locator(field('wind'))).toHaveText('WIND calm');
  await page.keyboard.down('KeyW');
  await advance(page, 3);
  await expect(page.locator(field('trolleySpeed'))).toContainText('→ WS');
  await page.keyboard.up('KeyW');
});

test('C switches between cabin and orbit views', async ({ page }) => {
  // The camera key is taken by the render loop, so wait for a frame.
  await page.keyboard.press('KeyC');
  await expect.poll(async () => (await state(page)).camera).toBe('orbit');
  await expect(page.locator(field('title'))).toHaveText('SPP-65 · ORBIT');
  await page.keyboard.press('KeyC');
  await expect.poll(async () => (await state(page)).camera).toBe('cabin');
});

test('F10 opens the tuning panel, and a change applies while driving', async ({ page }) => {
  await expect(page.locator('.lil-gui.lil-root')).toBeHidden();
  await page.keyboard.press('F10');
  await expect(page.locator('.lil-gui.lil-root')).toBeVisible();
  await page.locator('.lil-gui.lil-root .lil-title', { hasText: 'drive-trolley.json' }).click();
  const folder = page.locator('.lil-gui', { has: page.locator(':scope > .lil-title', { hasText: 'drive-trolley.json' }) });
  const speed = folder.locator('.lil-controller', { hasText: 'maxSpeed_mps' }).locator('input').first();
  await speed.fill('2');
  await speed.press('Enter');
  await page.locator('canvas').click({ position: { x: 5, y: 5 } });
  await page.keyboard.down('KeyW');
  await advance(page, 8);
  const s = await state(page);
  await page.keyboard.up('KeyW');
  expect(s.trolley.maxSpeed).toBe(2);
  expect(s.trolley.velocity).toBeCloseTo(2, 6);
  await page.screenshot({ path: 'tests/screenshots/tuning.png' });
});

test('a hard landing sounds the alarm and flashes the HUD', async ({ page }) => {
  await page.keyboard.down('ArrowDown');
  await advance(page, 15);
  await page.keyboard.up('ArrowDown');
  await expect(page.locator('.hud-message.alarm')).toContainText('HARD LANDING');
  await expect(page.locator(field('landed'))).toHaveText('ALL LANDED');
  await page.keyboard.press('Space');
  await advance(page, 0.1);
  await expect(page.locator('.hud-message.warn').first()).toContainText('LOCK REFUSED');
});

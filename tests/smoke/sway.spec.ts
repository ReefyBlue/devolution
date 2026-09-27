import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const appUrl = pathToFileURL(resolve('dist/quayops.html')).href;
const G = 9.81;

type Sample = { trolley: number; gantry: number };
const advance = (page: Page, s: number) => page.evaluate(`window.__quayops.advance(${s})`) as Promise<Sample[]>;
const ropeFall = (page: Page) => page.evaluate('window.__quayops.state().ropeFall') as Promise<number>;

/** Period from downward zero crossings of the trolley-axis sway (samples every 0.02 s). */
function period(trace: Sample[]): number {
  const t: number[] = [];
  for (let i = 1; i < trace.length; i++) {
    const a = trace[i - 1]!.trolley;
    const b = trace[i]!.trolley;
    if (a > 0 && b <= 0) t.push((i - 1 + a / (a - b)) * 0.02);
  }
  return (t[t.length - 1]! - t[0]!) / (t.length - 1);
}

const amplitude = (trace: Sample[]): number => Math.max(...trace.map((s) => Math.abs(s.trolley)));

test.beforeEach(async ({ page }) => {
  await page.goto(appUrl);
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
});

test('sway period at hoist +30 m and +12 m matches 2π√(ℓ/g) within 2 %', async ({ page }) => {
  for (const [height, expected] of [[30, 9.17], [12, 12.51]] as const) {
    await page.evaluate(`window.__quayops.setHoist(${height})`);
    await page.keyboard.down('KeyW');
    await advance(page, 2);
    await page.keyboard.up('KeyW');
    await advance(page, 6);
    const measured = period(await advance(page, 60));
    const theory = 2 * Math.PI * Math.sqrt((await ropeFall(page)) / G);
    console.info(`hoist +${height} m: period ${measured.toFixed(2)} s (theory ${theory.toFixed(2)} s, approved ${expected} s)`);
    expect(Math.abs(measured - expected) / expected).toBeLessThan(0.02);
  }
});

test('anti-sway (T) takes a 9° swing below 1° within one period; the decay is logged', async ({ page }) => {
  // A 2.2 s trolley pulse (accelerate, then brake) at hoist +30 m leaves about 9° of sway.
  await page.evaluate('window.__quayops.setHoist(30)');
  await page.keyboard.down('KeyW');
  await advance(page, 2.2);
  await page.keyboard.up('KeyW');
  await advance(page, 6);
  const before = amplitude(await advance(page, 9.2));
  await page.keyboard.press('KeyT');
  const trace = await advance(page, 18.4);
  expect(await page.evaluate('window.__quayops.state().antiSway')).toBe(true);
  const perPeriod = [0, 1].map((k) => amplitude(trace.slice(k * 460, (k + 1) * 460)));
  const last = Math.abs(trace[trace.length - 1]!.trolley);
  console.info(`anti-sway decay: ${before.toFixed(2)}° before, peaks ${perPeriod.map((p) => p.toFixed(2)).join('° → ')}° per 9.2 s, ${last.toFixed(2)}° after 18.4 s`);
  expect(before).toBeGreaterThan(7);
  expect(before).toBeLessThan(10);
  expect(perPeriod[1]!).toBeLessThan(1);
});

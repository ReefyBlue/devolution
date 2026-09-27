import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const appUrl = pathToFileURL(resolve('dist/quayops.html')).href;

// Fixed viewpoints for visual review; images go to tests/screenshots/ (not committed).
test('scene screenshots from fixed viewpoints', async ({ page }) => {
  await page.goto(appUrl);
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  const views = await page.evaluate(() => (window as unknown as { __quayops: { views: string[] } }).__quayops.views);
  for (const name of views) {
    await page.evaluate((n) => (window as unknown as { __quayops: { setView: (v: string) => void } }).__quayops.setView(n), name);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tests/screenshots/${name}.png` });
  }
});

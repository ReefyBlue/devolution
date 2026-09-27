// Shared smoke-run helpers: open the offline build, a virtual gamepad, and the app's test hooks.

import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const appUrl = pathToFileURL(resolve('dist/quayops.html')).href;
export const deadzone = (JSON.parse(readFileSync('config/controls.json', 'utf8')) as { gamepad: { deadzone: number } }).gamepad.deadzone;

export interface Drive {
  position: number;
  velocity: number;
  atLimit: boolean;
  min: number;
  max: number;
  maxSpeed: number;
}
export interface Box {
  id: string;
  location: { kind: string; slot?: string; position?: string };
  x: number;
  y: number;
  z: number;
  size: number;
}
export interface State {
  gantry: Drive;
  trolley: Drive;
  hoist: Drive;
  boom: Drive & { latched: boolean; interlock: string };
  ropeFall: number;
  antiSway: boolean;
  load: { x: number; fwr: number; y: number };
  sway: { trolley: number; gantry: number };
  spreader: { size: number | null; lock: string; flippers: number; landed: Record<string, boolean>; carried: string | null };
  boxes: Box[];
  events: { kind: string; [k: string]: unknown }[];
  camera: 'cabin' | 'orbit';
}
export type Sample = { trolley: number; gantry: number };

export const advance = (page: Page, s: number) => page.evaluate(`window.__quayops.advance(${s})`) as Promise<Sample[]>;
export const state = (page: Page) => page.evaluate('window.__quayops.state()') as Promise<State>;

/** Opens the app with a virtual standard-mapping gamepad behind the real Gamepad API. */
export async function openApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const testPad = { id: 'QuayOps test pad', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons };
    Object.assign(window, { __testPad: testPad });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [testPad, null, null, null] });
  });
  await page.goto(appUrl);
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
}

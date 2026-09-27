import { defineConfig } from '@playwright/test';

// Smoke runs load the offline build (dist/quayops.html) in headless Chromium.
// SwiftShader gives WebGL2 without a GPU, so this checks behaviour, not frame rate.
export default defineConfig({
  testDir: 'tests/smoke',
  timeout: 180_000,
  reporter: 'list',
  use: {
    viewport: { width: 1280, height: 720 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/tests/support',
  testMatch: 'ui-quality.spec.ts',
  workers: 1,
  timeout: 45000,
  expect: { timeout: 5000 },
  reporter: [['list']],
  use: { timezoneId: 'Asia/Taipei', trace: 'retain-on-failure', reducedMotion: 'reduce' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
});

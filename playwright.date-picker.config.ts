import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/tests/support',
  testMatch: 'date-picker.spec.ts',
  workers: 2,
  timeout: 30000,
  expect: { timeout: 3000 },
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
});

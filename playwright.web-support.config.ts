import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/tests/support',
  testMatch: ['date-picker.spec.ts', 'expense-form.spec.ts', 'save-outcomes.spec.ts', 'categories.spec.ts'],
  workers: 2,
  timeout: 15000,
  expect: { timeout: 3000 },
  reporter: [['list']],
  use: { timezoneId: 'Asia/Taipei', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
});

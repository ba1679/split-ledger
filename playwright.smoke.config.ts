import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/smoke',
  testMatch: '**/*.spec.ts',
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
});

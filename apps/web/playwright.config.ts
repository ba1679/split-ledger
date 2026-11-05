import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir: './tests', testMatch: '**/*.spec.ts', projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }, { name: 'webkit', use: devices['Desktop Safari'] }], use: { baseURL: 'http://127.0.0.1:5173' } });

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/api/tests/support',
  testMatch: '**/*.spec.ts',
  workers: 1,
  timeout: 30000,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
});

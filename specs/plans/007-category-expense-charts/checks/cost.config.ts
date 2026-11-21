import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '.', testMatch: 'analysis-cost.spec.ts', workers: 1, timeout: 120000, reporter: [['list']] });

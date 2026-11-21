import { defineConfig } from '@playwright/test';
import type { AnalysisTestOptions } from '../../../../apps/web/tests/support/category-analysis/options.js';
export default defineConfig<AnalysisTestOptions>({
  testDir: '.', testMatch: 'manual-analysis.spec.ts', workers: 1, timeout: 1800000,
  reporter: [['list']],
  use: { headless: false, viewport: { width: 1280, height: 800 }, timezoneId: 'Asia/Taipei', analysisViewport: 'desktop', launchOptions: { args: ['--force-renderer-accessibility'] } },
});

import { defineConfig, devices } from '@playwright/test';
import type { AnalysisTestOptions } from '../../../../apps/web/tests/support/category-analysis/options.js';
export default defineConfig<AnalysisTestOptions>({
  testDir: '.',
  testMatch: 'capture-analysis.spec.ts',
  workers: 1,
  timeout: 30000,
  expect: { timeout: 3000 },
  use: { timezoneId: 'Asia/Taipei', trace: 'retain-on-failure' },
  projects: ['chromium', 'webkit'].flatMap((browser) =>
    ['desktop', 'mobile'].map((viewport) => ({
      name: `${browser}-${viewport}`,
      use: {
        ...devices[browser === 'chromium' ? 'Desktop Chrome' : 'Desktop Safari'],
        analysisViewport: viewport as 'desktop' | 'mobile',
        hasTouch: viewport === 'mobile',
      },
    })),
  ),
});

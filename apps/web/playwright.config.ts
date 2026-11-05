import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
const testDir = defineBddConfig({ featuresRoot: fileURLToPath(new URL('../../specs/truth/features/frontend/', import.meta.url)), features: '../../specs/truth/features/frontend/**/*.feature', steps: './tests/steps/**/*.ts', importTestFrom: './tests/support/fixtures.ts', outputDir: './.features-gen', missingSteps: 'fail-on-gen', disableWarnings: { importTestFrom: true } });
export default defineConfig({ testDir, timeout: 15000, expect: { timeout: 3000 }, workers: 2, fullyParallel: true, reporter: [['list']], use: { trace: 'retain-on-failure', timezoneId: 'Asia/Taipei' }, projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }, { name: 'webkit', use: devices['Desktop Safari'] }] });

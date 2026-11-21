import { defineConfig } from '@playwright/test';
import base from './visual.config.js';
import type { AnalysisTestOptions } from '../../../../apps/web/tests/support/category-analysis/options.js';
export default defineConfig<AnalysisTestOptions>({ ...base, testMatch: 'quality-analysis.spec.ts' });

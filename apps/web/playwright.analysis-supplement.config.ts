import { defineConfig } from '@playwright/test';
import base from './playwright.analysis.config.js';
import type { AnalysisTestOptions } from './tests/support/category-analysis/options.js';

const fixed = [1, 2, 30, 31, 32, 33, 57, 58];
const mobile = Array.from({ length: 59 }, (_, index) => index + 1).filter(
  (id) => !fixed.includes(id),
);
const grep = new RegExp(
  `@F007-F(?:${mobile.map((id) => String(id).padStart(2, '0')).join('|')})\\b`,
);

export default defineConfig<AnalysisTestOptions>({
  ...base,
  projects: base.projects!.flatMap((project) => {
    const variant = project.name!.replace(/^(chromium|webkit)-/, '');
    if (variant === 'desktop') return [];

    return [{ ...project, ...(variant === 'mobile' ? { grep } : {}) }];
  }),
});

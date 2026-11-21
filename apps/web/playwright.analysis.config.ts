import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config.js';
import type { AnalysisTestOptions } from './tests/support/category-analysis/options.js';

const all = Array.from({ length: 59 }, (_, index) => index + 1);
const fixedDesktop = [1, 30, 31, 33, 57];
const fixedMobile = [2, 32, 58];
const reduced = [34, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50];
const scope = (ids: number[]) =>
  new RegExp(`@F007-F(?:${ids.map((id) => String(id).padStart(2, '0')).join('|')})\\b`);

export default defineConfig<AnalysisTestOptions>({
  ...base,
  workers: 1,
  projects: ['chromium', 'webkit'].flatMap((browser) => {
    const device = devices[browser === 'chromium' ? 'Desktop Chrome' : 'Desktop Safari'];

    return [
      {
        name: `${browser}-desktop`,
        grep: scope(all.filter((id) => !fixedMobile.includes(id))),
        use: {
          ...device,
          analysisViewport: 'desktop' as const,
          analysisVariant: 'default' as const,
        },
      },
      {
        name: `${browser}-mobile`,
        grep: scope(all.filter((id) => !fixedDesktop.includes(id))),
        use: {
          ...device,
          analysisViewport: 'mobile' as const,
          analysisVariant: 'default' as const,
          hasTouch: true,
        },
      },
      {
        name: `${browser}-touch-sector`,
        grep: scope([32, 58]),
        use: {
          ...device,
          analysisViewport: 'mobile' as const,
          analysisVariant: 'sector' as const,
          hasTouch: true,
        },
      },
      {
        name: `${browser}-keyboard-space`,
        grep: scope([33]),
        use: { ...device, analysisViewport: 'desktop' as const, analysisVariant: 'space' as const },
      },
      {
        name: `${browser}-reduced-desktop`,
        grep: scope(reduced),
        use: {
          ...device,
          analysisViewport: 'desktop' as const,
          analysisVariant: 'reduced-motion' as const,
          reducedMotion: 'reduce' as const,
        },
      },
      {
        name: `${browser}-reduced-mobile`,
        grep: scope(reduced),
        use: {
          ...device,
          analysisViewport: 'mobile' as const,
          analysisVariant: 'reduced-motion' as const,
          reducedMotion: 'reduce' as const,
          hasTouch: true,
        },
      },
    ];
  }),
});

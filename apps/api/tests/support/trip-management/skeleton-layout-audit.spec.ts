import { test, expect } from '@playwright/test';
import {
  assertSkeletonLayout,
  type SkeletonShape,
} from '../../../../web/tests/support/loading/skeleton-layout.js';

const box = (x: number, y: number, width: number, height: number): SkeletonShape => ({
  x,
  y,
  width,
  height,
});

test('structural skeleton oracle rejects generic bars and accepts responsive content layouts', () => {
  const flat = [box(0, 0, 220, 12), box(0, 32, 220, 12)];
  for (const layout of ['cards', 'list', 'form', 'summary'] as const)
    expect(() => assertSkeletonLayout(layout, flat)).toThrow();
  for (const width of [260, 600]) {
    assertSkeletonLayout('cards', [
      box(0, 0, width, 150),
      box(0, 166, 180, 16),
      box(0, 194, 100, 12),
    ]);
    assertSkeletonLayout('list', [
      box(0, 0, 100, 12),
      box(width - 60, 0, 60, 12),
      box(0, 48, 150, 12),
      box(width - 60, 48, 60, 12),
    ]);
    assertSkeletonLayout('form', [
      box(0, 0, 60, 12),
      box(0, 24, width, 40),
      box(0, 84, 60, 12),
      box(0, 108, width, 40),
    ]);
    assertSkeletonLayout('summary', [box(0, 0, 200, 24), box(0, 40, 120, 12), box(0, 66, 90, 12)]);
  }
});

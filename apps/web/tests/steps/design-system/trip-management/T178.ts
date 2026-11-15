import { Given, expect } from '../../../support/fixtures.js';
import type { InitialRead } from '../../../support/loading/initial-read.js';
import { assertInitialSkeleton } from '../../../support/loading/initial-skeleton.js';

Given('該內容已在等待且本次讀取即將成功', async ({ page, world }) => {
  const state = world.get<InitialRead>('loading:initial');
  expect(['成功', '成功空']).toContain(state.result);
  await page.goto(state.route, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => state.exchanges.length).toBeGreaterThan(0);
  await assertInitialSkeleton(world);
});

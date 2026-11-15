import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../api/tests/support/trip-management/preservation.js';
import { managementUI } from '../trips/management-fixture.js';
import type { InitialRead } from './initial-read.js';
import { initialContentRegion } from './initial-skeleton.js';
import { queryAttempts } from './query-attempts.js';

export async function assertInitialPaused(world: LedgerWorld): Promise<void> {
  const state = world.get<InitialRead>('loading:initial'),
    ui = managementUI(world),
    page = ui.page;
  expect(state.result).toBe('無網路');
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  const region = initialContentRegion(page, state);
  await expect(region).toBeVisible();
  const notice = region.getByRole('status');
  await expect(notice).toContainText(/等待連線|等待網路|目前離線/);
  await expect(region).toContainText(/恢復.*(?:連線|網路)|(?:連線|網路).*恢復|連上網路/);
  await expect(region).not.toContainText(/沒有旅行|尚無旅行|0\s*筆|成功|伺服器.*失敗|讀取失敗/);
  await expect(region.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  expect(
    await region.evaluate(
      (element) =>
        [...element.getAnimations({ subtree: true })].filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations === Infinity &&
            animation.playState === 'running',
        ).length,
    ),
  ).toBe(0);
  expect(queryAttempts(ui, state.query).length).toBe(0);
  expect(state.exchanges.length).toBe(0);
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  expect(ui.writes.length).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
  expect(await managementSnapshot(world)).toEqual(state.before);
  await assertOtherDataUnchanged(world);
}

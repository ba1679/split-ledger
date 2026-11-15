import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { initialContentRegion } from './initial-skeleton.js';
import type { InitialRead } from './initial-read.js';
import { queryAttempts, liveQueryAttempts, isCancelledRead } from './query-attempts.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function assertInitialFailed(world: LedgerWorld): Promise<void> {
  const state = world.get<InitialRead>('loading:initial'),
    ui = managementUI(world),
    page = ui.page;
  expect(state.result).toBe('明確失敗');
  expect(state.released).toBe(true);
  await waitForManagementReads(ui);
  const all = queryAttempts(ui, state.query),
    live = liveQueryAttempts(ui, state.query);
  expect(all.filter(isCancelledRead).length).toBeLessThanOrEqual(1);
  expect(live.length).toBe(1);
  expect(live[0]!.failure()).not.toBeNull();
  await expect.poll(() => state.finished).toBe(state.exchanges.length);
  const region = initialContentRegion(page, state);
  const error = region
    .getByRole('alert')
    .filter({ hasText: /無法取得|讀取失敗|無法讀取|暫時.*帳本/ });
  await expect(error).toBeVisible();
  await expect(error).not.toContainText(
    /Failed to fetch|Load failed|fetch failed|SyntaxError|JSON|content.length|Unexpected token/i,
  );
  await expect(
    region.getByRole('button', { name: /^(重新嘗試|重試|重新取得旅行清單)$/ }),
  ).toBeEnabled();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(
    page.locator(
      '[data-skeleton]:visible, .skeleton:visible, .query-skeleton:visible, [class*="spinner"]:visible, [data-busy-indicator]:visible',
    ),
  ).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(region.getByRole('status', { name: /正在|載入中|讀取中|整理中/ })).toHaveCount(0);
  await expect(region).not.toContainText(/(?:沒有|尚無|無)(?:旅行|帳本)|0\s*筆/);
  expect(state.screen).toBe('旅行清單');
  await expect(region.getByRole('heading', { name: '日本旅行', exact: true })).toHaveCount(0);
  const authority = await ownerRead(world, state.query);
  expect(authority.status()).toBe(200);
  expect(await authority.json()).toEqual(state.authority);
  expect((state.authority as { items: unknown[] }).items.length).toBeGreaterThan(0);
  expect(await managementSnapshot(world)).toEqual(state.before);
  await assertOtherDataUnchanged(world);
  expect(ui.writes.length).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
}

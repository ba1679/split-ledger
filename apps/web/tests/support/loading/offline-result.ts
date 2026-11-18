import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { ItemList, Trip } from '../../../src/api/index.js';
import {
  managementSnapshot,
  managementTripId,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../api/tests/support/trip-management/preservation.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';
import { assertInitialResult } from './initial-result.js';
import { initialContentRegion } from './initial-skeleton.js';
import type { OfflineRecovery } from './offline-recovery.js';
import { queryAttempts } from './query-attempts.js';
import { selectThumbnailDraft } from '../thumbnail/draft-fixture.js';

export async function assertOfflineRecovered(world: LedgerWorld): Promise<void> {
  const recovery = world.get<OfflineRecovery>('loading:offlineRecovery'),
    { state } = recovery,
    ui = managementUI(world),
    page = ui.page;
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  expect(recovery.original).toBeDefined();
  expect(queryAttempts(ui, state.query).length).toBe(1);
  expect(queryAttempts(ui, state.query)[0]).toBe(recovery.original);
  expect(recovery.documents.length).toBe(0);
  await assertInitialResult(world, '一般旅行');
  const region = initialContentRegion(page, state),
    items = (state.authority as ItemList<Trip>).items;
  await expect(region).not.toContainText(/等待連線|等待網路|目前離線|沒有旅行|尚無旅行|0\s*筆/);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  for (const trip of items)
    await expect(region.getByRole('heading', { name: trip.name, exact: true })).toHaveCount(1);
  await expect(region.getByRole('heading', { name: '私人旅行', exact: true })).toHaveCount(0);
  // Read-only follow-up navigation and a local file draft prove the page is usable again.
  const tripId = managementTripId(world);
  await region.locator(`a[href="/trips/${tripId}"]`).click();
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  await waitForManagementReads(ui);
  const trigger = page.getByRole('button', { name: '管理旅行', exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await page.getByRole('menuitem', { name: '自訂旅行縮圖', exact: true }).click();
  await selectThumbnailDraft(world, '神社照片');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: '保存圖片', exact: true }),
  ).toBeEnabled();
  expect(ui.writes.length).toBe(0);
  expect(await managementSnapshot(world)).toEqual(state.before);
  await assertOtherDataUnchanged(world);
  expect(state.errors.map(String)).toEqual([]);
}

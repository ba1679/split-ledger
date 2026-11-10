import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { assertArrangementsScreen } from './arrangements-screen-result.js';
import {
  rejectedSimplificationSaveKey,
  simplificationSaveRejection,
  type RejectedSimplificationSave,
} from './rejected-simplification-save.js';
import { simplificationToggleKey, type SimplificationToggle } from './toggle-simplification.js';
import { settlementScreenWritesKey, type ModeTripProjection } from './settlement-screen.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';

export const rejectedSimplificationScreenPhrase = '保留關閉模式的已確認兩筆安排並提供重試';

/** Verify the failed operation without activating retry or issuing another mode mutation. */
export async function assertRejectedSimplificationScreen(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const rejected = world.get<RejectedSimplificationSave>(rejectedSimplificationSaveKey);
  const action = world.get<SimplificationToggle>(simplificationToggleKey);
  expect(action.enabled).toBe(true);
  expect(action.outcome).toBe('rejected');
  expect(action.status).toBe(simplificationSaveRejection.status);
  expect(action.response).toEqual(simplificationSaveRejection.body);
  expect(action.before).toEqual(rejected.confirmed);
  expect(action.confirmed, 'A rejected mode has no newly confirmed recommendations').toBeNull();
  expect(action.after).toEqual(rejected.confirmed.snapshot);
  const expectedWrites: RepaymentBrowserWrite[] = [
    {
      method: 'PATCH',
      path: `/api/trips/${splittingTripId(world)}`,
      body: { simplifyDebts: true },
    },
  ];
  expect(rejected.requests).toEqual(expectedWrites);
  expect(world.get<RepaymentBrowserWrite[]>(settlementScreenWritesKey)).toEqual(expectedWrites);
  const tripResponse = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}`);
  expect(tripResponse.status()).toBe(200);
  const trip = (await tripResponse.json()) as ModeTripProjection;
  expect(trip.id).toBe(rejected.confirmed.trip.id);
  expect(trip.simplifyDebts).toBe(false);
  expect(trip.accountingRevision).toBe(rejected.confirmed.trip.accountingRevision);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(rejected.confirmed.snapshot);
  const control = page.getByRole('switch', { name: '簡化付款', exact: true });
  await expect(control).toBeVisible();
  await expect(control).not.toBeChecked();
  const error = page.getByRole('alert');
  await expect(error).toBeVisible();
  await expect(error).toContainText(/簡化付款/);
  await expect(error).toContainText(/失敗|無法|未能/);
  const retry = page.getByRole('button', { name: /重試/ });
  await expect(retry).toHaveCount(1);
  await expect(retry).toBeVisible();
  await expect(retry).toBeEnabled();
  await assertArrangementsScreen(page, world, [
    { 付款人: 'Alice', 收款人: 'Bob', 幣別: 'JPY', 金額: '60', 顯示: 'JPY 60' },
    { 付款人: 'Bob', 收款人: 'Carol', 幣別: 'JPY', 金額: '60', 顯示: 'JPY 60' },
  ]);
  const links = page.locator(`a[href*="/trips/${splittingTripId(world)}/settlements/new"]`);
  expect(
    await links.evaluateAll((elements) =>
      elements.map((element) => (element as HTMLAnchorElement).href),
    ),
  ).toEqual(rejected.confirmed.arrangementLinks);
  await expect(
    page.getByRole('status').filter({ hasText: /保存成功|儲存成功|簡化付款已開啟|兩筆變一筆/ }),
  ).toHaveCount(0);
  expect(rejected.requests, 'Then must not click retry or send another mode write').toEqual(
    expectedWrites,
  );
  expect(world.get<RepaymentBrowserWrite[]>(settlementScreenWritesKey)).toEqual(expectedWrites);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(rejected.confirmed.snapshot);
}

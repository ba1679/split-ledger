import { When, expect } from '../../../support/fixtures.js';
import type { InitialRead } from '../../../support/loading/initial-read.js';
import { initialContentRegion } from '../../../support/loading/initial-skeleton.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import {
  queryAttempts,
  liveQueryAttempts,
  isCancelledRead,
} from '../../../support/loading/query-attempts.js';

When('原次資料讀取完成', async ({ page, world }) => {
  const state = world.get<InitialRead>('loading:initial'),
    ui = managementUI(world);
  const matching = () => queryAttempts(ui, state.query);
  await expect.poll(() => liveQueryAttempts(ui, state.query).length).toBe(1);
  const originalAll = [...matching()],
    original = liveQueryAttempts(ui, state.query)[0]!;
  expect(originalAll.filter(isCancelledRead).length).toBeLessThanOrEqual(1);
  expect(state.exchanges.length).toBeGreaterThanOrEqual(1);
  expect(state.released).toBe(false);
  state.release();
  const response = await original.response();
  expect(response?.status()).toBe(200);
  expect(await response!.finished()).toBeNull();
  expect(await response!.json()).toEqual(state.authority);
  await expect.poll(() => state.finished).toBe(state.exchanges.length);
  await expect(initialContentRegion(page, state)).toBeVisible();
  await expect
    .poll(() => initialContentRegion(page, state).getAttribute('aria-busy'))
    .not.toBe('true');
  await waitForManagementReads(ui);
  expect(matching().length).toBe(originalAll.length);
  expect(
    matching().every((request, index) => request === originalAll[index]),
    'Release must not start or replace any query attempt',
  ).toBe(true);
  expect(liveQueryAttempts(ui, state.query).length).toBe(1);
  expect(liveQueryAttempts(ui, state.query)[0] === original).toBe(true);
  expect(ui.writes.length).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
});

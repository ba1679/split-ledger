import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { OfflineRecovery } from './offline-recovery.js';
import { awaitInitialReadHeld } from './initial-read.js';
import { queryAttempts, liveQueryAttempts } from './query-attempts.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function reconnectInitialRead(world: LedgerWorld): Promise<void> {
  const recovery = world.get<OfflineRecovery>('loading:offlineRecovery'),
    { state } = recovery,
    ui = managementUI(world),
    page = ui.page;
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  expect(queryAttempts(ui, state.query).length).toBe(0);
  await page.context().setOffline(false);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(true);
  await awaitInitialReadHeld(world);
  const attempts = queryAttempts(ui, state.query);
  expect(attempts.length).toBe(1);
  const original = liveQueryAttempts(ui, state.query)[0]!;
  recovery.original = original;
  state.release();
  const response = await original.response();
  expect(response?.status()).toBe(200);
  expect(await response!.finished()).toBeNull();
  expect(await response!.json()).toEqual(state.authority);
  await expect.poll(() => state.finished).toBe(state.exchanges.length);
  await waitForManagementReads(ui);
  expect(queryAttempts(ui, state.query).length).toBe(1);
  expect(queryAttempts(ui, state.query)[0]).toBe(original);
  expect(recovery.documents.length).toBe(0);
  expect(page.url()).toBe(recovery.url);
  expect(ui.writes.length).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
}

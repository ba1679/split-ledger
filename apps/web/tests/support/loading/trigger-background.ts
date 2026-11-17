import { assertFailedJsonRead } from './failed-json-read.js';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { BackgroundRead } from './background-fixture.js';
import { connectedQueryExchanges } from './query-attempts.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function triggerBackground(world: LedgerWorld): Promise<void> {
  const state = world.get<BackgroundRead>('loading:background'),
    ui = managementUI(world),
    page = ui.page;
  expect(state.triggered).toBe(false);
  expect(state.requests.length).toBe(0);
  const startUrl = page.url(),
    readStart = ui.reads.length,
    path = `/api/trips/${state.pagination.tripId}/expenses`;
  expect(await page.evaluate(() => document.visibilityState)).toBe('visible');
  state.triggered = true;
  // This is the installed query-core FocusManager's real public browser-event entry point.
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(() => connectedQueryExchanges(state.exchanges).length).toBe(1);
  expect(state.requests.length).toBe(1);
  expect(new URL(state.requests[0]!.url()).searchParams.get('cursor')).toBeNull();
  expect(state.finished).toBe(0);
  if (state.result !== '延遲') {
    state.release();
    if (state.result === '明確失敗') {
      await waitForManagementReads(ui);
      await assertFailedJsonRead(state.requests[0]!, state.exchanges[0]!.body);
      expect(state.requests.length).toBe(1);
      expect(state.finished).toBe(1);
    } else {
      await expect.poll(() => state.requests.length).toBe(2);
      await waitForManagementReads(ui);
      expect(new URL(state.requests[1]!.url()).searchParams.get('cursor')).toBe(
        state.pagination.cursor,
      );
      expect(state.finished).toBe(2);
      for (const read of state.requests) {
        const response = await read.response();
        expect(response?.status()).toBe(200);
        expect(await response!.finished()).toBeNull();
      }
    }
  } else
    await expect
      .poll(
        () => [...ui.pending].filter((request) => new URL(request.url()).pathname !== path).length,
      )
      .toBe(0);
  for (const read of ui.reads
    .slice(readStart)
    .filter((request) => new URL(request.url()).pathname !== path)) {
    const response = await read.response();
    expect(response?.status()).toBe(200);
    expect(await response!.finished()).toBeNull();
  }
  await expect(page).toHaveURL(startUrl);
  expect(ui.writes.length).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
  world.set('loading:backgroundAct', { startUrl, readStart });
}

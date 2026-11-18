import { openOfflineTrips } from '../../../support/loading/offline-network.js';
import { queryAttempts } from '../../../support/loading/query-attempts.js';
import { When, expect } from '../../../support/fixtures.js';
import { awaitInitialReadHeld, type InitialRead } from '../../../support/loading/initial-read.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

When('owner 開啟全站 {string}', async ({ page, world }, screen: string) => {
  const state = world.get<InitialRead>('loading:initial');
  expect(screen).toBe(state.screen);
  expect(managementUI(world).writes.length).toBe(0);
  if (state.result === '無網路') {
    await openOfflineTrips(page);
    expect(queryAttempts(managementUI(world), state.query).length).toBe(0);
    expect(state.exchanges.length).toBe(0);
  } else await page.goto(state.route, { waitUntil: 'domcontentloaded' });
  if (state.result !== '無網路') {
    await awaitInitialReadHeld(world);
    expect(state.finished).toBe(0);
    expect(state.errors.map(String)).toEqual([]);
    if (state.result === '明確失敗') state.release();
  }
  expect(managementUI(world).writes.length).toBe(0);
});

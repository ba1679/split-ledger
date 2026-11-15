import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { arrangeInitialRead, type InitialRead } from './initial-read.js';
import { openOfflineTrips } from './offline-network.js';
import { assertInitialPaused } from './initial-paused.js';
import { queryAttempts } from './query-attempts.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { managementUI } from '../trips/management-fixture.js';

export interface OfflineRecovery {
  state: InitialRead;
  documents: Request[];
  url: string;
  original?: Request;
}

export async function arrangeOfflineRecovery(page: Page, world: LedgerWorld): Promise<void> {
  await arrangeInitialRead(page, world, '旅行清單', '一般旅行', '無網路');
  await openOfflineTrips(page);
  await assertInitialPaused(world);
  const state = world.get<InitialRead>('loading:initial');
  const recovery: OfflineRecovery = { state, documents: [], url: page.url() };
  const observe = (request: Request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      recovery.documents.push(request);
  };
  page.on('request', observe);
  world.tripManagement.cleanups.add(async () => {
    page.off('request', observe);
  });
  const authority = await ownerRead(world, state.query);
  expect(authority.status()).toBe(200);
  expect(await authority.json()).toEqual(state.authority);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  expect(queryAttempts(managementUI(world), state.query).length).toBe(0);
  expect(managementUI(world).writes.length).toBe(0);
  world.set('loading:offlineRecovery', recovery);
}

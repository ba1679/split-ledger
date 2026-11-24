import { randomUUID } from 'node:crypto';
import { expect, type Browser, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  managementSnapshot,
  managementTripId,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { expectedCurrentState } from '../../../../api/tests/support/trip-management/rejections.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import {
  arrangeManagementPage,
  managementUI,
  waitForManagementReads,
} from './management-fixture.js';

export async function arrangeStaleLink(
  page: Page,
  world: LedgerWorld,
  browser: Browser,
  state: string,
): Promise<void> {
  expect(['垃圾桶', '已永久刪除']).toContain(state);
  await arrangeManagementPage(page, world, '帳本');
  const tripId = managementTripId(world),
    path = `/trips/${tripId}`;
  const active = await ownerRead(world, `/api/trips/${tripId}`);
  expect(active.status()).toBe(200);
  const confirmed = await active.json();
  await page.getByRole('link', { name: '記一筆', exact: true }).click();
  await page.getByLabel('支出項目', { exact: true }).fill('未保存的午餐');
  await page.getByLabel('支出金額', { exact: true }).fill('777');
  const draft = {
    item: await page.getByLabel('支出項目', { exact: true }).inputValue(),
    amount: await page.getByLabel('支出金額', { exact: true }).inputValue(),
    date: await page.getByRole('textbox', { name: '支出日期', exact: true }).inputValue(),
  };
  await waitForManagementReads(managementUI(world));
  const before = await managementSnapshot(world, tripId);
  const device = await browser.newContext({ baseURL: world.get<string>('webOrigin') });
  try {
    await device.addCookies(await page.context().cookies());
    const headers = { origin: world.get<string>('webOrigin') };
    const trash = await device.request.post(`/api/trips/${tripId}/trash`, {
      headers,
      data: {
        operationId: randomUUID(),
        expectedLifecycleRevision: String(before.trips[0]!.lifecycle_revision),
      },
    });
    expect(trash.status()).toBe(200);
    const trashed = await trash.json();
    expect(trashed.result.state).toBe('trash');
    if (state === '已永久刪除') {
      const purge = await device.request.post(`/api/trips/${tripId}/purge`, {
        headers,
        data: {
          operationId: randomUUID(),
          expectedLifecycleRevision: trashed.currentState.lifecycleRevision,
        },
      });
      expect(purge.status()).toBe(200);
      expect((await purge.json()).result.state).toBe('purged');
    }
  } finally {
    await device.close();
  }
  const current = await managementSnapshot(world, tripId);
  expect(expectedCurrentState(current).state).toBe(state === '垃圾桶' ? 'trash' : 'purged');
  const authority = await ownerRead(world, `/api/trips/${tripId}/state`);
  expect(authority.status()).toBe(200);
  expect(await authority.json()).toEqual(expectedCurrentState(current));
  expect(managementUI(world).writes.length).toBe(0);
  expect(page.url()).toContain(`${path}/expenses/new`);
  await assertOtherDataUnchanged(world);
  world.set('management:staleLink', { state, tripId, path, draft, confirmed, before, current });
}

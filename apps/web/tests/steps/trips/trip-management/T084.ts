import { Then, expect } from '../../../support/fixtures.js';
import type { Response } from '@playwright/test';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { ownerTripPages } from '../../../../../api/tests/support/trip-management/lifecycle-result.js';
import {
  managementSnapshot,
  managementTripId,
} from '../../../../../api/tests/support/trip-management/baseline.js';

Then('畫面呈現 {string} 的真正空狀態', async ({ world }, scope: string) => {
  expect(['一般清單', '垃圾桶']).toContain(scope);
  const response = world.get<Response>('management:emptyResponse');

  expect(response.status()).toBe(200);
  expect((await response.json()).items).toEqual([]);
  const ui = managementUI(world);
  const { page } = ui;
  const generalEmpty = page.getByText(
    /^(?:旅程，從第一本帳本開始。|(?:目前)?沒有旅行|尚未建立旅行)[。！!]?$/,
  );
  const trashEmpty = page.getByText(
    /沒有已刪旅行|垃圾桶[^。]*?(?:空|沒有)|還沒有[^。]*?移[^。]*?垃圾桶/,
  );

  await expect(scope === '一般清單' ? generalEmpty : trashEmpty).toBeVisible();
  await expect(scope === '一般清單' ? trashEmpty : generalEmpty).toBeHidden();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"], .skeleton, [data-skeleton]')).toHaveCount(0);
  const selected = scope === '一般清單' ? 'active' : 'trash';

  expect(await ownerTripPages(world, selected)).toEqual([]);
  const opposite = await ownerTripPages(world, selected === 'active' ? 'trash' : 'active');

  expect(opposite).toHaveLength(1);
  expect(opposite[0]).toMatchObject({ id: managementTripId(world), name: '日本旅行' });
  expect(ui.writes).toEqual([]);
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
});

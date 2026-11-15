import { Then, expect } from '../../../support/fixtures.js';
import type { TripManagementSnapshot } from '../../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../../api/tests/support/trip-management/preservation.js';
import { expectedCurrentState } from '../../../../../api/tests/support/trip-management/rejections.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';

Then('舊連結只提供 {string} 的下一步而不顯示帳務', async ({ world }, state: string) => {
  const ui = managementUI(world),
    page = ui.page;
  const stale = world.get<{
    state: string;
    tripId: string;
    path: string;
    current: TripManagementSnapshot;
    draft: { item: string; amount: string; date: string };
  }>('management:staleLink');
  expect(state).toBe(stale.state);
  if (state === '垃圾桶') {
    await expect(page.getByText(/旅行已在垃圾桶/).first()).toBeVisible();
    const next = page.getByRole('link', { name: /垃圾桶|復原/ });
    await expect(next).toHaveAttribute('href', '/trips/trash');
    await next.click({ trial: true });
  } else {
    expect(state).toBe('已永久刪除');
    await expect(page.getByText(/旅行不存在|找不到這趟旅行|旅行已永久刪除/).first()).toBeVisible();
    const next = page.getByRole('link', { name: /返回旅行清單|回旅行清單/ });
    await expect(next).toHaveAttribute('href', '/trips');
    await next.click({ trial: true });
  }
  await waitForManagementReads(ui);
  await expect(page.getByRole('region', { name: '成員淨額', exact: true })).toBeHidden();
  await expect(page.getByText('晚餐', { exact: true })).toBeHidden();
  await expect(page.getByText('私人旅行', { exact: true })).toBeHidden();
  await expect(
    page.getByRole('link', { name: /^(記一筆|同行者|成員|還款|結清|付款安排|旅行總額)$/ }),
  ).toBeHidden();
  await expect(
    page.getByRole('button', { name: /^(儲存支出|儲存修改|新增成員|記錄還款|結清|建立付款安排)$/ }),
  ).toBeHidden();
  const exposed = await page.evaluate(() =>
    Boolean((window as unknown as { staleLedgerExposed?: boolean }).staleLedgerExposed),
  );
  expect(exposed, 'Stale ordinary ledger must never flash while current authority resolves').toBe(
    false,
  );
  // Both variants explicitly arranged this owner's unsubmitted text draft. It is not
  // purged server accounting, and must remain observable without becoming writable.
  const draftFields = [
    ['支出項目', stale.draft.item],
    ['金額', stale.draft.amount],
    ['支出日期', stale.draft.date],
  ];
  const itemField = page.getByRole('textbox', {
    name: '支出項目',
    exact: true,
    includeHidden: true,
  });
  if (await itemField.count()) {
    for (const [label, value] of draftFields) {
      const field = page.getByRole('textbox', { name: label!, exact: true, includeHidden: true });
      await expect(field).toHaveCount(1);
      await expect(field).toHaveValue(value!);
      expect((await field.isDisabled()) || (await field.getAttribute('readonly')) !== null).toBe(
        true,
      );
    }
  } else {
    // Accept a read-only summary instead of imposing a hidden-input storage design.
    const draft = page
      .getByRole('region', { name: /草稿/ })
      .or(page.getByRole('group', { name: /草稿/ }));
    await expect(draft).toBeVisible();
    for (const [, value] of draftFields) await expect(draft).toContainText(value!);
    await expect(draft.getByRole('button', { name: /儲存|保存|送出/ })).toHaveCount(0);
  }
  const authority = await ownerRead(world, `/api/trips/${stale.tripId}/state`);
  expect(authority.status()).toBe(200);
  expect(await authority.json()).toEqual(expectedCurrentState(stale.current));
  const trip = await ownerRead(world, `/api/trips/${stale.tripId}`);
  expect(trip.status()).toBe(state === '垃圾桶' ? 409 : 404);
  expect(await trip.json()).toMatchObject({
    code: state === '垃圾桶' ? 'TRIP_TRASHED' : 'NOT_FOUND',
  });
  expect(await managementSnapshot(world, stale.tripId)).toEqual(stale.current);
  expect(ui.writes.length).toBe(0);
  await assertOtherDataUnchanged(world);
});

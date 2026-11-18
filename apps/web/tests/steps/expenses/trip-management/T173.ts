import { When, expect } from '../../../support/fixtures.js';
import type { StaleExpenseDraft } from '../../../support/expenses/stale-draft.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import { expectedCurrentState } from '../../../../../api/tests/support/trip-management/rejections.js';

When('owner 從舊表單保存點心', async ({ world }) => {
  const state = world.get<StaleExpenseDraft>('expense:staleDraft');
  const ui = managementUI(world),
    path = `/api/trips/${state.tripId}/expenses`;
  expect(ui.writes.length).toBe(0);
  state.readStart = ui.reads.length;
  const completed = ui.page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === path,
  );
  await ui.page.getByRole('button', { name: '儲存支出', exact: true }).click();
  const response = await completed;
  expect(response.status()).toBe(409);
  expect(await response.finished()).toBeNull();
  expect(await response.json()).toMatchObject({ code: 'TRIP_TRASHED' });
  expect(response.request().postDataJSON()).toMatchObject({
    item: '點心',
    amount: '500',
    currencyCode: 'JPY',
  });
  const statePath = `/api/trips/${state.tripId}/state`;
  await expect
    .poll(() =>
      ui.reads.slice(state.readStart).some((read) => new URL(read.url()).pathname === statePath),
    )
    .toBe(true);
  await waitForManagementReads(ui);
  const reads = ui.reads.slice(state.readStart);
  expect(reads.length).toBeGreaterThan(0);
  for (const read of reads) {
    expect(new URL(read.url()).pathname).toBe(statePath);
    const result = await read.response();
    expect(result?.status()).toBe(200);
    expect(await result!.finished()).toBeNull();
    expect(await result!.json()).toEqual(expectedCurrentState(state.trashed));
  }
  expect(ui.writes.length).toBe(1);
  expect(await managementSnapshot(world)).toEqual(state.trashed);
});

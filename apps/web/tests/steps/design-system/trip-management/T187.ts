import { Then, expect } from '../../../support/fixtures.js';
import { awaitInitialReadHeld, type InitialRead } from '../../../support/loading/initial-read.js';
import { isCancelledRead } from '../../../support/loading/query-attempts.js';
import { optionRegion, assertOptionDraft } from '../../../support/loading/option-wait.js';
import { assertSpinnerOnly } from '../../../support/loading/spinner-result.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../../api/tests/support/trip-management/preservation.js';

Then('局部選項等待且必要內容未齊不能保存', async ({ page, world }) => {
  const state = world.get<InitialRead>('loading:initial'),
    ui = managementUI(world);
  const region = optionRegion(page, state.content);
  await expect(region).toHaveAttribute('aria-busy', 'true');
  await assertSpinnerOnly(
    region.getByRole('status'),
    new RegExp(`(?:讀取|載入).*${state.content}|${state.content}.*(?:讀取|載入)`),
  );
  await expect(region).not.toContainText(/沒有(?:選項|分類|幣別|成員)|無可用|0\s*筆/);
  await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeDisabled();
  await assertOptionDraft(world);
  await expect(page.getByLabel('支出項目', { exact: true })).toBeEnabled();
  await expect(page.getByLabel('支出金額', { exact: true })).toBeEnabled();
  for (const read of ui.reads) {
    if (isCancelledRead(read)) continue;
    const path = new URL(read.url()).pathname;
    if (
      ![
        '/api/currencies',
        '/api/categories',
        `/api/trips/${state.before.trips[0]!.id}/members`,
      ].includes(path)
    )
      continue;
    if (path === state.query)
      expect((state.authority as { items: unknown[] }).items.length).toBeGreaterThan(0);
    else {
      const response = await read.response();
      expect(response?.status()).toBe(200);
      expect((await response!.json()).items.length).toBeGreaterThan(0);
    }
  }
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  await awaitInitialReadHeld(world);
  expect(ui.writes.length).toBe(0);
  expect(await managementSnapshot(world)).toEqual(state.before);
  await assertOtherDataUnchanged(world);
});

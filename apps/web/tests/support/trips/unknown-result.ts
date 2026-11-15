import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../api/tests/support/trip-management/preservation.js';
import type { CommittedResponseLoss } from './committed-response-loss.js';
import type { NewTripFlow } from './new-trip-flow.js';
import { managementUI } from './management-fixture.js';

export async function assertUnknownOutcome(world: LedgerWorld): Promise<void> {
  const state = world.get<CommittedResponseLoss>('management:responseLoss');
  await state.finished;
  expect(state.failure).toBeUndefined();
  expect(state.done).toBe(true);
  expect(state.outcome).toBeDefined();
  expect(state.after).toBeDefined();
  const command = state.command!;
  const { page } = managementUI(world);

  await expect(
    page
      .getByText(/(?:結果|操作)[^。]*?(?:尚未確認|無法確認)|尚無法確認[^。]*?(?:結果|操作)/)
      .first(),
  ).toBeVisible({ timeout: 15000 });
  const verify = page.getByRole('button', { name: '再次查證', exact: true });
  await expect(verify).toBeVisible({ timeout: 15000 });
  await expect(verify).toBeEnabled({ timeout: 15000 });
  expect(state.mutations.length).toBe(1);
  expect(state.verifications.length).toBeGreaterThan(0);
  const receipts = state.verifications.filter((row) => row.operationId !== undefined);
  expect(
    receipts.length,
    'Unknown command must query its original receipt, not infer from lists',
  ).toBeGreaterThan(0);
  for (const lookup of state.verifications) {
    expect(lookup.blocked).toBe(true);
    if (lookup.tripId !== undefined) expect(lookup.tripId).toBe(command.tripId);
    if (lookup.operationId !== undefined) expect(lookup.operationId).toBe(command.operationId);
  }
  const disabledNames =
    state.operation === '移至垃圾桶'
      ? /^(移至垃圾桶|確認移入|再次移入)$/
      : state.operation === '永久刪除'
        ? /^(永久刪除|確認永久刪除|再次永久刪除)$/
        : /^(保存圖片|再次保存|重試保存|重新上傳|建立旅行)$/;
  for (const button of await page.getByRole('button', { name: disabledNames }).all())
    if (await button.isVisible()) await expect(button).toBeDisabled();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /移入成功|已移至垃圾桶|已永久刪除|保存成功|圖片已保存|圖片未保存/ }),
  ).toBeHidden();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: /操作失敗|保存失敗|旅行建立失敗|旅行已建立.*圖片未保存/s }),
  ).toBeHidden();
  const visible = await page.locator('body').innerText();
  expect(visible).not.toContain(command.operationId);
  expect(visible).not.toContain(command.tripId);
  if (state.operation === '新增附圖') {
    const flow = world.get<NewTripFlow>('management:newTripFlow');
    expect(flow.creates.length).toBe(1);
    expect(flow.images.length).toBe(1);
    await expect(page.getByText(/旅行已建立/).first()).toBeVisible();
    await expect(page.getByText(/圖片[^。]*?(?:尚未確認|無法確認|未知)/).first()).toBeVisible();
    await expect(page.getByText(/(?:目前|現在).*預設風景/)).toBeHidden();
  }
  expect(await managementSnapshot(world, command.tripId)).toEqual(state.after);
  await assertOtherDataUnchanged(world);
}

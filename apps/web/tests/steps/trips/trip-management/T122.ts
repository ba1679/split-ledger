import { Then, expect } from '../../../support/fixtures.js';
import type { OwnedWriteRejection } from '../../../../../api/tests/support/trip-management/write-rejection.js';
import { observedLifecycleCommand } from '../../../support/trips/browser-command.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';
import { ownerRead } from '../../../../../api/tests/support/trip-management/preservation.js';

Then('旅行操作失敗可重試且沒有成功假象', async ({ world }) => {
  const { operation, fault } = world.get<{ operation: string; fault: OwnedWriteRejection }>(
    'management:lifecycleFault',
  );
  const endpoint =
    operation === '移至垃圾桶' ? 'trash' : operation === '復原' ? 'restore' : 'purge';
  const { response, command } = await observedLifecycleCommand(world, endpoint);
  expect(await fault.attempts()).toBe(1);
  expect(response.status()).toBe(400);
  const error = await response.json();
  expect(error).toMatchObject({ code: 'VALIDATION_ERROR', message: expect.any(String) });
  expect(error.message.length).toBeGreaterThan(0);
  expect(JSON.stringify(error)).not.toMatch(/23514|test_reject_|006 isolated/);
  const { page } = managementUI(world);
  const area = operation === '復原' ? page : page.getByRole('dialog');
  const alert = area.getByRole('alert').filter({ hasText: /失敗|無法|不能|不正確/ });
  await expect(alert).toBeVisible();
  await expect(alert).not.toContainText(/尚未確認|結果未知|查證中/);
  await expect(area.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(area.getByRole('progressbar')).toHaveCount(0);
  const retry = area.getByRole('button', {
    name: operation === '復原' ? '復原旅行' : operation,
    exact: true,
  });
  await expect(retry).toBeEnabled();
  await retry.click({ trial: true });
  await expect(
    page.getByRole('status').filter({ hasText: /已移至垃圾桶|已永久刪除|已復原|操作成功/ }),
  ).toBeHidden();
  await expect(page.getByText('VALIDATION_ERROR', { exact: true })).toBeHidden();
  const receipt = await ownerRead(
    world,
    `/api/trips/${command.tripId}/operations/${command.operationId}`,
  );
  expect(receipt.status()).toBe(404);
  expect(await receipt.json()).toMatchObject({ code: 'OPERATION_NOT_FOUND' });
  await assertManagementUnchanged(world, 1);
});

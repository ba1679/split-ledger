import { Given, expect } from '../../../support/fixtures.js';
import { arrangeManagementPage, managementUI } from '../../../support/trips/management-fixture.js';
import { arrangeUnknownReset } from '../../../support/thumbnail/unknown-reset.js';
import type { CommittedResponseLoss } from '../../../support/trips/committed-response-loss.js';
import { assertUnknownOutcome } from '../../../support/trips/unknown-result.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';

Given('原次預設圖片結果未知且編輯曾關閉再返回', async ({ page, world }) => {
  await arrangeManagementPage(page, world, '縮圖編輯');
  await arrangeUnknownReset(world);
  const loss = world.get<CommittedResponseLoss>('management:responseLoss');
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: '管理旅行', exact: true }).click();
  await page.getByRole('menuitem', { name: '自訂旅行縮圖', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName(/自訂旅行縮圖/);
  await assertUnknownOutcome(world);
  expect(managementUI(world).writes.length).toBe(1);
  expect(loss.command!.kind).toBe('reset_thumbnail');
  expect(await managementSnapshot(world)).toEqual(loss.after);
  world.set('management:returnedImageVerification', {
    tripId: loss.command!.tripId,
    operationId: loss.command!.operationId,
    verificationStart: loss.verifications.length,
  });
  loss.unblock();
});

import { Then, expect } from '../../../support/fixtures.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { observedLifecycleCommand } from '../../../support/trips/browser-command.js';
import { assertPurgedTrip } from '../../../../../api/tests/support/trip-management/purge-result.js';
import { assertOtherDataUnchanged } from '../../../../../api/tests/support/trip-management/preservation.js';

Then('完成整趟清除後才顯示永久刪除成功', async ({ world }) => {
  const { response, command } = await observedLifecycleCommand(world, 'purge');

  // The real 200 and committed receipt must precede this success branch.
  await assertPurgedTrip(world, response, command);
  const ui = managementUI(world);
  const { page } = ui;

  await expect(page).toHaveURL(/\/trips\/trash$/);
  await waitForManagementReads(ui);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('日本旅行', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '復原旅行', exact: true })).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: /永久刪除/ })).toBeVisible();
  expect(ui.writes).toHaveLength(1);
  await assertOtherDataUnchanged(world);
});

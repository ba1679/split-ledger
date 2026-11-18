import { Given, expect } from '../../../support/fixtures.js';
import { arrangeManagementPage } from '../../../support/trips/management-fixture.js';
import { arrangeNewTripDraft } from '../../../support/trips/new-trip-fixture.js';
import {
  assertNewTripFields,
  assertNewTripNotCreated,
} from '../../../support/trips/uncommitted-new-trip.js';

Given('不合法選圖仍留在新增旅行草稿', async ({ page, world }) => {
  await arrangeManagementPage(page, world, '新增表單');
  await arrangeNewTripDraft(world, '不合法HEIC');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert').filter({ hasText: /HEIC/i })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: '移除選圖', exact: true })).toBeEnabled();
  await assertNewTripFields(world);
  await assertNewTripNotCreated(world);
});

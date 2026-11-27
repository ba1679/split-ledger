import { goToTripList, tripEditor } from '../../../support/home-navigation.js';
import { Given, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { selectThumbnailDraft } from '../../../support/thumbnail/draft-fixture.js';
import { assertDraftUrlsReleased } from '../../../support/thumbnail/object-urls.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Given('前次縮圖草稿已取消且原縮圖為富士山', async ({ world }) => {
  const { page } = managementUI(world);

  await goToTripList(page);
  await tripEditor(page).click();
  await page.getByRole('menuitem', { name: '更換縮圖', exact: true }).click();
  await selectThumbnailDraft(world, '神社照片');
  await selectThumbnailDraft(world, '預設圖');
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await assertDraftUrlsReleased(page);
  await assertManagementUnchanged(world);
  world.set('management:abandonedDraft', { filename: '神社照片.png', intent: 'reset' });
});

import { When, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { cancelFileChooser } from '../../../support/thumbnail/chooser-cancel.js';

When('owner 取消檔案選擇', async ({ world }) => {
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');
  const sources = await dialog
    .locator('img:visible')
    .evaluateAll((images) => images.map((image) => image.getAttribute('src')));
  const result = await cancelFileChooser(
    page,
    dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ }),
  );

  await expect(dialog).toBeVisible();
  world.set('management:cancelledChooser', { ...result, sources });
});

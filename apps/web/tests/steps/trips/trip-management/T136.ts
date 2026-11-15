import { When, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

When('owner 查看可選圖片條件', async ({ world }) => {
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');
  const help = dialog.getByText(/支援.*(?:JPG|JPEG).*PNG.*WebP/i).first();
  await help.scrollIntoViewIfNeeded();
  await expect(help).toBeVisible();
  const picker = dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ });
  // Inspect the already-open region without invoking the native chooser or submitting.
  await picker.focus();
  await expect(picker).toBeFocused();
  world.set('management:selectionPolicyView', {
    text: await dialog.innerText(),
    url: page.url(),
    device: world.get<string>('management:declaredDevice'),
  });
  expect(managementUI(world).writes.length).toBe(0);
});

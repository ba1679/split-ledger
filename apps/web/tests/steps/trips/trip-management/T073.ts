import { tripEditor } from '../../../support/home-navigation.js';
import { Then, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Then('選單關閉且焦點返回管理旅行', async ({ world }) => {
  const { page } = managementUI(world);
  const trigger = tripEditor(page);

  await expect(page.getByRole('menu')).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: '日本旅行', exact: true }) })
    .click({ trial: true });
  await assertManagementUnchanged(world);
});

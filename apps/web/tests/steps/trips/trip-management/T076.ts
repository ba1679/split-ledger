import { assertDraftUrlsReleased } from '../../../support/thumbnail/object-urls.js';
import { Then, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Then('關閉未確認操作不改變旅行資料', async ({ world }) => {
  const ui = managementUI(world);
  const closed = world.get<{ editor: string }>('management:closedDialog');
  const { page } = ui;
  const triggerName =
    closed.editor === '永久刪除確認'
      ? '永久刪除'
      : closed.editor === '新增表單'
        ? '新增旅行'
        : '編輯 日本旅行';

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(ui.startUrl);
  await expect(page.getByRole('button', { name: triggerName, exact: true })).toBeFocused();
  if (closed.editor === '永久刪除確認') {
    await expect(page.getByRole('heading', { name: /垃圾桶/ })).toBeVisible();
    await expect(page.getByText('日本旅行', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '復原旅行', exact: true }).click({ trial: true });
  } else if (closed.editor === '新增表單') {
    await expect(
      page
        .getByRole('link')
        .filter({ has: page.getByRole('heading', { name: '日本旅行', exact: true }) }),
    ).toBeVisible();
    await page.getByRole('button', { name: '新增旅行', exact: true }).click({ trial: true });
  } else {
    await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
    await page
      .getByRole('link')
      .filter({ has: page.getByRole('heading', { name: '日本旅行', exact: true }) })
      .click({ trial: true });
  }
  await assertManagementUnchanged(world);
  if (world.state.has('management:draft')) await assertDraftUrlsReleased(page);
});

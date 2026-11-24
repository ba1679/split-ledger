import { Given, Then, expect } from '../../support/fixtures.js';
import { readBrowserSplittingSnapshot } from '../../support/splitting/fixture.js';
import { seedTaiwaneseCompanions } from '../../support/splitting/taiwanese-fixture.js';
import {
  viewBrowserMembers,
  viewedMembersKey,
  type ViewedMembers,
} from '../../support/splitting/view-members.js';

Given('繁中旅行已經有同行者小宇', async ({ page, world }) => {
  await seedTaiwaneseCompanions(page, world);
  world.set('008:membersBefore', await readBrowserSplittingSnapshot(world));
});

Given('繁中旅行已經有同行者小宇且新增表單已開啟', async ({ page, world }) => {
  await seedTaiwaneseCompanions(page, world);
  world.set('008:membersBefore', await readBrowserSplittingSnapshot(world));
  await viewBrowserMembers(page, world);
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: '新增同行者', exact: true }) });
  await expect(form).toHaveCount(1);
  await expect(form.getByRole('textbox', { name: '同行者名稱', exact: true })).toHaveValue('');
});

Then('同行者頁省略兩段常駐說明並保留名稱欄', async ({ page, world }) => {
  await expect(page.getByRole('textbox', { name: '同行者名稱', exact: true })).toBeVisible();
  await expect(
    page.getByText('同行者不用登入，由你統一管理這趟旅行的帳務。', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('前後空白會自動去除；同一趟旅行內名稱不可重複。', { exact: true }),
  ).toHaveCount(0);
  const { members, after } = world.get<ViewedMembers>(viewedMembersKey);
  expect(members).toContainEqual(
    expect.objectContaining({ id: world.splitting.ids.members.get('小宇'), name: '小宇' }),
  );
  expect(after).toEqual(world.get('008:membersBefore'));
});

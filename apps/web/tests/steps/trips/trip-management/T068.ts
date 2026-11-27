import { tripEditor } from '../../../support/home-navigation.js';
import { Then, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Then('管理選單列出日期、縮圖與移入入口而不遮罩旅行清單', async ({ world }) => {
  const { page } = managementUI(world);
  const trigger = tripEditor(page);
  const menu = page.getByRole('menu');

  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  const controls = await trigger.getAttribute('aria-controls');

  expect(controls).toBeTruthy();
  await expect(menu).toHaveAttribute('id', controls!);
  await expect(menu.getByRole('menuitem', { name: '編輯旅行日期', exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: '更換縮圖', exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: '移至垃圾桶', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  const anchor = await trigger.boundingBox(),
    bounds = await menu.boundingBox();

  expect(anchor).not.toBeNull();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(anchor!.y + anchor!.height);
  expect(bounds!.y).toBeLessThanOrEqual(anchor!.y + anchor!.height + 16);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(anchor!.x + anchor!.width + 16);
  // Trial checks pointer reachability without navigating or mutating the ledger.
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: '日本旅行', exact: true }) })
    .click({ trial: true });
  await assertManagementUnchanged(world);
});

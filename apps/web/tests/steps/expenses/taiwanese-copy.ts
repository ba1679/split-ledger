import type { Page } from '@playwright/test';
import { seedSplittingExpenses } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { Given, Then, When, expect } from '../../support/fixtures.js';
import {
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
} from '../../support/splitting/fixture.js';
import { seedTaiwaneseCompanions } from '../../support/splitting/taiwanese-fixture.js';

const snapshotKey = '008:dinner-before';

async function openLedger(page: Page, world: LedgerWorld): Promise<void> {
  await page.goto(`/trips/${splittingTripId(world)}`);
  await expect(page.locator('.expense-row').filter({ hasText: '晚餐' })).toBeVisible();
  await expect(page.getByRole('region', { name: '成員淨額' })).toBeVisible();
}

Given('繁中旅行已有小安與小宇的共同晚餐 TWD 600', async ({ page, world, $testInfo }) => {
  await seedTaiwaneseCompanions(page, world);
  await seedSplittingExpenses(world, [
    { 項目: '晚餐', 幣別: 'TWD', 金額: '600', 付款人: '小安', 分攤者: '小安、小宇' },
  ]);
  const original = await readBrowserSplittingSnapshot(world);
  expect(original.expenses.items).toHaveLength(1);
  expect(original.expenses.items[0]!.shares.map((share) => share.amount)).toEqual([
    { numerator: '30000', denominator: '1', minorUnit: 2 },
    { numerator: '30000', denominator: '1', minorUnit: 2 },
  ]);
  world.set(snapshotKey, original);
  if ($testInfo.title === '兩人均分六百元晚餐') await openLedger(page, world);
});

When('owner 查看旅行帳本', async ({ page, world }) => {
  await openLedger(page, world);
});

When('owner 查看晚餐支出詳情', async ({ page, world }) => {
  const original = world.get<BrowserSplittingSnapshot>(snapshotKey);
  const path = `/trips/${splittingTripId(world)}/expenses/${original.expenses.items[0]!.id}`;
  const read = page.waitForResponse(
    (response) => new URL(response.url()).pathname === `/api${path}`,
  );
  await page.locator('.expense-row').filter({ hasText: '晚餐' }).click();
  expect((await read).ok()).toBe(true);
  await expect(page.locator('.expense-form')).toBeVisible();
});

Then('帳本以「分帳」及「記一筆」標示整體流程與新增支出入口', async ({ page, world }) => {
  const main = page.locator('main');
  await expect(main.getByRole('link', { name: /分帳/u })).toBeVisible();
  await expect(main.getByRole('link', { name: '記一筆', exact: true })).toBeVisible();
  expect(await readBrowserSplittingSnapshot(world)).toEqual(world.get(snapshotKey));
});

Then('支出明細以「支出金額」與「分攤」標示原額及兩人各 TWD 300', async ({ page, world }) => {
  const form = page.locator('.expense-form');
  await expect(form.getByLabel('支出金額', { exact: true })).toHaveValue(/^600(?:\.00)?$/u);
  const shares = page.getByRole('list', { name: /分攤/u });
  for (const name of ['小安', '小宇']) {
    const row = shares.getByRole('listitem').filter({ hasText: name });
    await expect(row).toContainText(/TWD 300(?:\.00)?/u);
  }
  expect(await readBrowserSplittingSnapshot(world)).toEqual(world.get(snapshotKey));
});

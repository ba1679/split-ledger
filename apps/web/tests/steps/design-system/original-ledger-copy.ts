import { randomUUID } from 'node:crypto';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  assertExactArrangementSet,
  directExpenseArrangements,
} from '../../../../api/tests/support/splitting/expense-arrangements-result.js';
import { Given, Then, When, expect } from '../../support/fixtures.js';
import {
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
} from '../../support/splitting/fixture.js';
import { seedTaiwaneseCompanions } from '../../support/splitting/taiwanese-fixture.js';

const originalLedgerKey = '008:original-ledger';
const tripName = '東京自由行';
const memberName = '小宇';
const categoryName = '餐飲';
const itemName = '晚餐先代墊';
const otherItem = '車票';
interface OriginalLedger {
  tripId: string;
  mealId: string;
  ticketId: string;
  before: BrowserSplittingSnapshot;
}

Given(
  '英文帳本已有中文旅行名稱、成員名稱、分類名稱和支出項目，以及未分類支出、多幣別與循環小數分攤',
  async ({ page, world }) => {
    await seedTaiwaneseCompanions(page, world, [memberName, '小美'], 'en', tripName);
    const tripId = splittingTripId(world);
    const owner = splittingMemberId(world, '小安');
    const members = [owner, splittingMemberId(world, memberName), splittingMemberId(world, '小美')];
    const categoryId = randomUUID();
    const category = await callApi(world, 'POST', '/api/categories', {
      id: categoryId,
      name: categoryName,
    });
    expect(category.status()).toBe(201);
    const mealId = randomUUID();
    const ticketId = randomUUID();
    const path = `/api/trips/${tripId}/expenses`;
    const meal = await callApi(world, 'POST', path, {
      id: mealId,
      item: itemName,
      categoryId,
      currencyCode: 'TWD',
      amount: '180',
      spentOn: '2027-03-11',
      payerMemberId: owner,
      shareMemberIds: members,
    });
    const ticket = await callApi(world, 'POST', path, {
      id: ticketId,
      item: otherItem,
      currencyCode: 'JPY',
      amount: '100',
      spentOn: '2027-03-12',
      payerMemberId: owner,
      shareMemberIds: members,
    });
    expect(meal.status(), await meal.text()).toBe(201);
    expect(ticket.status(), await ticket.text()).toBe(201);
    const before = await readBrowserSplittingSnapshot(world);
    expect(before.expenses.items.find(({ id }) => id === mealId)).toMatchObject({
      item: itemName,
      category: { id: categoryId, name: categoryName },
    });
    expect(before.expenses.items.find(({ id }) => id === ticketId)).toMatchObject({
      item: otherItem,
      category: null,
      shares: members.map(() =>
        expect.objectContaining({
          amount: { numerator: '100', denominator: '3', minorUnit: 0 },
        }),
      ),
    });
    expect(before.settlement.simplifyDebts).toBe(false);
    assertExactArrangementSet(
      before.settlement.arrangements,
      directExpenseArrangements(before.sources),
    );
    world.set(originalLedgerKey, { tripId, mealId, ticketId, before });
  },
);

When('使用者查看原帳本', async ({ page, world }) => {
  const { tripId, mealId, ticketId } = world.get<OriginalLedger>(originalLedgerKey);
  await page.goto(`/trips/${tripId}`);
  for (const id of [mealId, ticketId])
    await expect(
      page.locator(`a.expense-row[href="/trips/${tripId}/expenses/${id}"]`),
    ).toBeVisible();
  await expect(page.getByText(memberName, { exact: true }).first()).toBeVisible();
});

Then('使用者輸入的四種文字維持原文且未分類標籤顯示英文', async ({ page, world }) => {
  const { tripId, mealId, ticketId, before } = world.get<OriginalLedger>(originalLedgerKey);
  const meal = before.expenses.items.find(({ id }) => id === mealId)!;
  const mealRow = page.locator(`a.expense-row[href="/trips/${tripId}/expenses/${mealId}"]`);
  const ticketRow = page.locator(`a.expense-row[href="/trips/${tripId}/expenses/${ticketId}"]`);
  await expect(page.getByRole('heading', { name: tripName, exact: true })).toBeVisible();
  await expect(page.getByText(memberName, { exact: true }).first()).toBeVisible();
  await expect(mealRow.getByText(meal.item, { exact: true })).toBeVisible();
  await expect(mealRow.getByText(meal.category!.name, { exact: true })).toBeVisible();
  await expect.soft(ticketRow.getByText('Uncategorized', { exact: true })).toBeVisible();
});

Then('幣別、原始金額、分攤與結算精確結果與權威帳務一致', async ({ page, world }) => {
  const { tripId, mealId, ticketId, before } = world.get<OriginalLedger>(originalLedgerKey);
  const after = await readBrowserSplittingSnapshot(world);
  expect(after).toEqual(before);
  assertExactArrangementSet(
    after.settlement.arrangements,
    directExpenseArrangements(after.sources),
  );
  const owesTwd = page.getByRole('group', { name: '小宇 TWD', exact: true });
  const owesJpy = page.getByRole('group', { name: '小宇 JPY', exact: true });
  const receivesJpy = page.getByRole('group', { name: '小安 JPY', exact: true });
  await expect(owesTwd.getByText('owes', { exact: true })).toBeVisible();
  await expect(owesTwd.locator('strong')).toHaveText('TWD 60');
  await expect(owesJpy.getByText('owes', { exact: true })).toBeVisible();
  await expect(owesJpy.locator('strong')).toHaveText('JPY 33.33');
  await expect(receivesJpy.getByText('is owed', { exact: true })).toBeVisible();
  await expect(receivesJpy.locator('strong')).toHaveText('JPY 66.67');
  await expect(
    page.locator(`a.expense-row[href="/trips/${tripId}/expenses/${mealId}"]`),
  ).toContainText(/TWD\s+180(?:[.,]00)?\b/u);
  await expect(
    page.locator(`a.expense-row[href="/trips/${tripId}/expenses/${ticketId}"]`),
  ).toContainText(/JPY\s+100\b/u);
});

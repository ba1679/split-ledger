import { chooseCurrency, dateInput } from '../expense-helpers.js';
import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  analysisContext,
  analysisSnapshot,
} from '../../../../api/tests/support/category-analysis/fixture.js';
import type { AnalysisSeedRow } from '../../../../api/tests/support/category-analysis/contracts.js';

export async function appendBrowserAnalysis(
  page: Page,
  world: LedgerWorld,
  rows: AnalysisSeedRow[],
) {
  const c = analysisContext(world),
    before = await analysisSnapshot(world);
  for (const row of rows) {
    if (row.分類 !== '未分類' && !c.categories.has(row.分類!)) {
      const existing = (
        await world.db.query('SELECT id FROM categories WHERE owner_id=$1 AND name=$2', [
          world.users.get('Alice')!.id,
          row.分類,
        ])
      ).rows;
      if (existing.length) c.categories.set(row.分類!, existing[0].id);
      else {
        await page.locator('a[href="/categories"]:visible').click();
        await page.getByRole('button', { name: '新增分類', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '新增分類', exact: true });
        await dialog.getByLabel('分類名稱', { exact: true }).fill(row.分類!);
        await dialog.getByRole('button', { name: '儲存', exact: true }).click();
        await expect(dialog).toBeHidden();
        const saved = (
          await world.db.query('SELECT id FROM categories WHERE owner_id=$1 AND name=$2', [
            world.users.get('Alice')!.id,
            row.分類,
          ])
        ).rows;
        expect(saved).toHaveLength(1);
        c.categories.set(row.分類!, saved[0].id);
        await page.goBack();
        await expect(page).toHaveURL(new RegExp(`/trips/${c.tripId}$`));
      }
    }
    await page
      .getByRole('link', { name: '記一筆', exact: true })
      .or(page.getByRole('link', { name: '記錄第一筆支出', exact: true }))
      .first()
      .click();
    await page.getByLabel('支出項目', { exact: true }).fill(row.項目!);
    await chooseCurrency(page, row.幣別!);
    await page.getByLabel('金額', { exact: true }).fill(row.金額!);
    await dateInput(page).fill('2027/04/03');
    await dateInput(page).press('Tab');
    await page
      .getByRole('combobox', { name: /^分類(?:選填)?$/ })
      .fill(row.分類 === '未分類' ? '' : row.分類!);
    await page.getByRole('option', { name: row.分類!, exact: true }).click();
    await page.getByRole('radio', { name: row.付款人!, exact: true }).check();
    const names = row.分攤者!.split('、');
    for (const [name] of c.members)
      await page.getByRole('checkbox', { name, exact: true }).setChecked(names.includes(name));
    await page.getByRole('button', { name: '儲存支出', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/trips/${c.tripId}$`));
    const saved = (
      await world.db.query('SELECT * FROM expenses WHERE trip_id=$1 AND item=$2', [
        c.tripId,
        row.項目,
      ])
    ).rows;
    expect(saved).toHaveLength(1);
    c.expenses.set(row.項目!, saved[0].id);
    expect(
      (
        await world.db.query(
          'SELECT member_id FROM expense_shares WHERE expense_id=$1 ORDER BY member_id',
          [saved[0].id],
        )
      ).rows.map((r) => r.member_id),
    ).toEqual(names.map((n) => c.members.get(n)).sort());
  }
  const after = await analysisSnapshot(world);
  for (const old of before.expenses!)
    expect(after.expenses!.find((e) => e.id === old.id)).toEqual(old);
  world.set('analysis:source', after);
}

export async function openBrowserAnalysisExpense(page: Page, world: LedgerWorld, item: string) {
  const c = analysisContext(world);
  await page
    .locator(`a.expense-row[href="/trips/${c.tripId}/expenses/${c.expenses.get(item)}"]`)
    .click();
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue(item);
}

export async function finishBrowserAnalysisSave(page: Page, world: LedgerWorld) {
  await page.getByRole('button', { name: '儲存支出', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/trips/${analysisContext(world).tripId}$`));
  world.set('analysis:source', await analysisSnapshot(world));
}

export async function saveBrowserAnalysisAmount(
  page: Page,
  world: LedgerWorld,
  item: string,
  currency: string,
  amount: string,
) {
  const c = analysisContext(world),
    before = await analysisSnapshot(world);
  await openBrowserAnalysisExpense(page, world, item);
  await chooseCurrency(page, currency);
  await page.getByLabel('金額', { exact: true }).fill(amount);
  await finishBrowserAnalysisSave(page, world);
  const row = (await world.db.query('SELECT * FROM expenses WHERE id=$1', [c.expenses.get(item)]))
    .rows[0];
  const [whole, decimal = ''] = amount.split('.');
  expect(row).toMatchObject({
    currency_code: currency,
    amount_minor: String(
      BigInt(whole!) * 10n ** BigInt(row.minor_unit) +
        BigInt(decimal.padEnd(row.minor_unit, '0') || '0'),
    ),
  });
  expect((await analysisSnapshot(world)).shares).toEqual(before.shares);
}

export async function saveBrowserAnalysisShares(
  page: Page,
  world: LedgerWorld,
  item: string,
  names: string,
) {
  const c = analysisContext(world),
    before = await analysisSnapshot(world),
    id = c.expenses.get(item);
  await openBrowserAnalysisExpense(page, world, item);
  const selected = names.split('、');
  for (const [name] of c.members)
    await page.getByRole('checkbox', { name, exact: true }).setChecked(selected.includes(name));
  await finishBrowserAnalysisSave(page, world);
  const after = await analysisSnapshot(world);
  expect(after.expenses!.find((e) => e.id === id)).toMatchObject({
    amount_minor: before.expenses!.find((e) => e.id === id)!.amount_minor,
    payer_member_id: before.expenses!.find((e) => e.id === id)!.payer_member_id,
  });
  expect(
    after
      .shares!.filter((s) => s.expense_id === id)
      .map((s) => s.member_id)
      .sort(),
  ).toEqual(selected.map((n) => c.members.get(n)).sort());
}

export async function deleteBrowserAnalysisExpense(page: Page, world: LedgerWorld, item: string) {
  const c = analysisContext(world),
    before = await analysisSnapshot(world),
    id = c.expenses.get(item);
  await openBrowserAnalysisExpense(page, world, item);
  await page.getByRole('button', { name: '刪除支出', exact: true }).click();
  await page
    .getByRole('dialog', { name: '刪除這筆支出？', exact: true })
    .getByRole('button', { name: '確認刪除', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/trips/${c.tripId}$`));
  const after = await analysisSnapshot(world);
  expect(after.expenses).toEqual(before.expenses!.filter((e) => e.id !== id));
  expect(after.shares!.some((s) => s.expense_id === id)).toBe(false);
  world.set('analysis:deletedExpenseId', id);
  world.set('analysis:source', after);
}

export async function renameBrowserAnalysisCategory(
  page: Page,
  world: LedgerWorld,
  oldName: string,
  newName: string,
) {
  const c = analysisContext(world),
    id = c.categories.get(oldName),
    before = await analysisSnapshot(world);
  await page.locator('a[href="/categories"]:visible').click();
  await page.getByRole('button', { name: `改名：${oldName}`, exact: true }).click();
  await page.getByLabel('分類名稱', { exact: true }).fill(newName);
  await page
    .getByRole('dialog', { name: '分類改名', exact: true })
    .getByRole('button', { name: '儲存', exact: true })
    .click();
  await expect(page.getByRole('dialog', { name: '分類改名', exact: true })).toBeHidden();
  expect((await world.db.query('SELECT id,name FROM categories WHERE id=$1', [id])).rows).toEqual([
    { id, name: newName },
  ]);
  expect((await analysisSnapshot(world)).expenses).toEqual(before.expenses);
  c.categories.delete(oldName);
  c.categories.set(newName, id!);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/trips/${c.tripId}$`));
  world.set('analysis:source', await analysisSnapshot(world));
}

export async function clearBrowserAnalysisCategory(page: Page, world: LedgerWorld, item: string) {
  const c = analysisContext(world),
    before = await analysisSnapshot(world),
    id = c.expenses.get(item);
  await openBrowserAnalysisExpense(page, world, item);
  await page.getByRole('combobox', { name: /^分類(?:選填)?$/ }).fill('');
  await page.getByRole('option', { name: '未分類', exact: true }).click();
  await finishBrowserAnalysisSave(page, world);
  const after = await analysisSnapshot(world),
    original = before.expenses!.find((e) => e.id === id)!;
  expect(after.expenses!.find((e) => e.id === id)).toMatchObject({
    category_id: null,
    amount_minor: original.amount_minor,
  });
  expect(after.shares).toEqual(before.shares);
  expect(after.categories).toEqual(before.categories);
}

export async function disableBrowserAnalysisMember(
  page: Page,
  world: LedgerWorld,
  oldName: string,
  newName: string,
) {
  const c = analysisContext(world),
    before = await analysisSnapshot(world),
    id = c.members.get(oldName);
  await page.locator(`a[href="/trips/${c.tripId}/members"]:visible`).first().click();
  await page.getByRole('button', { name: `改名 ${oldName}`, exact: true }).click();
  const rename = page.getByRole('dialog', { name: `管理 ${oldName}`, exact: true });
  await rename.getByLabel('同行者名稱', { exact: true }).fill(newName);
  await rename.getByRole('button', { name: '儲存名稱', exact: true }).click();
  await expect(rename).toBeHidden();
  await page.getByRole('button', { name: `停用 ${newName}`, exact: true }).click();
  const confirm = page.getByRole('dialog', { name: `停用 ${newName}`, exact: true });
  await confirm.getByRole('button', { name: '停用', exact: true }).click();
  await expect(confirm).toBeHidden();
  expect(
    (await world.db.query('SELECT id,name,is_active FROM trip_members WHERE id=$1', [id])).rows,
  ).toEqual([{ id, name: newName, is_active: false }]);
  expect((await analysisSnapshot(world)).shares).toEqual(before.shares);
  c.members.set(newName, id!);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/trips/${c.tripId}$`));
  world.set('analysis:source', await analysisSnapshot(world));
}

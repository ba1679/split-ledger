import { mkdir } from 'node:fs/promises';
import { test, expect } from './fixtures.js';
import { login, openExpenseForm } from './browser.js';
import { seedExpense } from '../../../api/tests/support/seed.js';

test.use({ hasTouch: true });

test('historical TWD metadata edits omit the untouched decimal amount and preserve stored precision', async ({
  page,
  world,
}) => {
  const expense = await seedExpense(world, {
    item: '歷史台幣',
    amount: '100.50',
    currencyCode: 'TWD',
  });

  await login(page, world);
  await page.goto(`/trips/${expense.trip_id}/expenses/${expense.id}`);
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue('100.50');
  await page.getByLabel('支出項目', { exact: true }).fill('歷史台幣已改名');
  const patch = page.waitForRequest(
    (request) =>
      request.method() === 'PATCH' &&
      new URL(request.url()).pathname.endsWith(`/expenses/${expense.id}`),
  );

  await page.getByRole('button', { name: '儲存支出', exact: true }).click();
  const payload = (await patch).postDataJSON() as Record<string, unknown>;

  expect(payload).not.toHaveProperty('amount');
  expect(payload).not.toHaveProperty('currencyCode');
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  const stored = (
    await world.db.query(
      'SELECT item,amount_minor::text,minor_unit,currency_code FROM expenses WHERE id=$1',
      [expense.id],
    )
  ).rows[0];

  expect(stored).toEqual({
    item: '歷史台幣已改名',
    amount_minor: '10050',
    minor_unit: 2,
    currency_code: 'TWD',
  });
});

test('mobile currency selection rejects a whole invalid paste and permits exact manual precision correction', async ({
  page,
  world,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, world);
  await openExpenseForm(page, world);
  await page.getByLabel('支出項目', { exact: true }).fill('巷口飲料');
  const currency = page.getByRole('combobox', { name: '幣別', exact: true }),
    amount = page.getByLabel('金額', { exact: true });

  await currency.fill('USD');
  await currency.press('ArrowDown');
  await currency.press('Enter');
  await expect(currency).toHaveValue(/^USD\b/);
  await amount.fill('12.50');
  const rejected = await amount.evaluate((element) => {
    const input = element as HTMLInputElement;

    input.setSelectionRange(0, input.value.length);
    const clipboardData = new DataTransfer();

    clipboardData.setData('text', '99.999');
    const event = new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true });

    input.dispatchEvent(event);

    return event.defaultPrevented;
  });

  expect(rejected).toBe(true);
  await expect(amount).toHaveValue('12.50');
  await expect(page.getByText('貼上的金額不符合幣別位數，已保留原值。')).toBeVisible();
  await currency.fill('JPY');
  await page
    .getByRole('option')
    .filter({ hasText: /^JPY\b/ })
    .tap();
  await expect(currency).toHaveValue(/^JPY\b/);
  await expect(amount).toHaveValue('12.50');
  await expect(page.getByText('目前金額不符合新幣別的小數位數，請手動修正。')).toBeVisible();
  // ArrowRight reaches the caret end on both macOS and other desktop platforms.
  await amount.focus();
  for (let index = 0; index < 5; index++) await amount.press('ArrowRight');
  await amount.press('Backspace');
  await expect(amount).toHaveValue('12.5');
  await amount.press('Backspace');
  await expect(amount).toHaveValue('12.');
  await amount.press('Backspace');
  await expect(amount).toHaveValue('12');
  await page.getByRole('button', { name: '展開分類選單', exact: true }).tap();
  await page.getByRole('option', { name: '未分類', exact: true }).tap();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const directory = new URL('../../../../.cache/ui-validation/', import.meta.url);

  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: new URL(`expense-375-${testInfo.project.name}.png`, directory).pathname,
    fullPage: true,
  });
  await page.getByRole('button', { name: '儲存支出', exact: true }).click();
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  expect(
    (
      await world.db.query(
        'SELECT amount_minor::text,currency_code,minor_unit FROM expenses WHERE owner_id=$1',
        [world.users.get('甲')!.id],
      )
    ).rows,
  ).toEqual([{ amount_minor: '12', currency_code: 'JPY', minor_unit: 0 }]);
});

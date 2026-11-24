import { test, expect } from './fixtures.js';
import { login, openExpenseForm } from './browser.js';
import { seedCategory, seedExpense, callApi } from '../../../api/tests/support/seed.js';

test('category names count Unicode code points, trim Unicode spaces and fold only ASCII case', async ({
  page,
  world,
}) => {
  await seedCategory(world, 'Food');
  await login(page, world);
  await page.goto('/categories');

  async function create(name: string) {
    await page.getByRole('button', { name: '新增分類', exact: true }).click();
    const form = page.getByRole('dialog', { name: '新增分類', exact: true });

    await form.getByLabel('分類名稱', { exact: true }).fill(name);
    await form.getByRole('button', { name: '儲存', exact: true }).click();

    return form;
  }

  const thirty = '🍵'.repeat(30);

  await expect(await create(`\u00a0${thirty}\u3000`)).toBeHidden();
  expect(
    (
      await world.db.query('SELECT name FROM categories WHERE owner_id=$1 AND name=$2', [
        world.users.get('甲')!.id,
        thirty,
      ])
    ).rowCount,
  ).toBe(1);
  const tooLong = await create('🍵'.repeat(31));

  await expect(tooLong.getByRole('alert')).toHaveText('分類名稱最多 30 個字。');
  await expect(tooLong.getByLabel('分類名稱', { exact: true })).toHaveValue('🍵'.repeat(31));
  await tooLong.getByRole('button', { name: '取消', exact: true }).click();
  await expect(await create('Ä')).toBeHidden();
  await expect(await create('ä')).toBeHidden();
  const duplicate = await create(' fOOD ');

  await expect(duplicate.getByRole('alert')).toHaveText('已有相同名稱的分類。');
  expect(
    (
      await world.db.query('SELECT name FROM categories WHERE owner_id=$1 ORDER BY name', [
        world.users.get('甲')!.id,
      ])
    ).rows
      .map((row) => row.name)
      .sort(),
  ).toEqual(['Food', 'Ä', 'ä', thirty].sort());
});

test('category search does not clear preference; explicit selection does, and editing keeps original association', async ({
  page,
  world,
}) => {
  const transport = await seedCategory(world, '交通'),
    meals = await seedCategory(world, '餐飲');
  const lunch = await seedExpense(world, { item: '午餐', amount: '1200', categoryName: '餐飲' });
  const unclassified = await seedExpense(world, { item: '晚餐', amount: '800' });
  const other = await seedCategory(world, '他人的分類', '乙');
  const identity = await login(page, world),
    key = `travel-ledger:last-category:${identity.id}`;

  await page.goto('/trips');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key,
    value: transport.id,
  });
  await openExpenseForm(page, world);
  const combo = page.getByRole('combobox', { name: /分類/ });

  await expect(combo).toHaveValue('交通');
  await combo.fill('餐');
  await expect(page.getByRole('option', { name: '餐飲', exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(transport.id);
  await combo.press('Escape');
  await combo.click();
  await page.getByRole('option', { name: '未分類', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull();
  await combo.click();
  await page.getByRole('option', { name: '餐飲', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(meals.id);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key,
    value: transport.id,
  });
  await page.goto(`/trips/${lunch.trip_id}/expenses/${lunch.id}`);
  await expect(combo).toHaveValue('餐飲');
  await page.goto(`/trips/${unclassified.trip_id}/expenses/${unclassified.id}`);
  await expect(combo).toHaveValue('未分類');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key,
    value: other.id,
  });
  await openExpenseForm(page, world);
  await expect(combo).toHaveValue('未分類');
  await combo.click();
  await expect(page.getByRole('option', { name: '他人的分類', exact: true })).toHaveCount(0);
});

test('unavailable localStorage still permits selecting and saving a real category association', async ({
  page,
  world,
}) => {
  const transport = await seedCategory(world, '交通');

  await login(page, world);
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Storage unavailable', 'SecurityError');
      },
    }),
  );
  await openExpenseForm(page, world);
  await page.getByLabel('支出項目', { exact: true }).fill('車票');
  await page.getByLabel('支出金額', { exact: true }).fill('1200');
  await page.getByRole('combobox', { name: /分類/ }).click();
  await page.getByRole('option', { name: '交通', exact: true }).click();
  await page.getByRole('button', { name: '儲存支出', exact: true }).click();
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  const saved = (
    await world.db.query(
      'SELECT item,category_id,amount_minor::text FROM expenses WHERE owner_id=$1',
      [world.users.get('甲')!.id],
    )
  ).rows;

  expect(saved).toEqual([{ item: '車票', category_id: transport.id, amount_minor: '1200' }]);
});

test('a stored preference must finish authoritative category validation before saving', async ({
  page,
  world,
}) => {
  const transport = await seedCategory(world, '交通'),
    identity = await login(page, world);

  await page.goto('/trips');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: `travel-ledger:last-category:${identity.id}`,
    value: transport.id,
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route('**/api/categories', async (route) => {
    await gate;
    await route.continue();
  });
  await openExpenseForm(page, world);
  await expect(page.getByRole('combobox', { name: '幣別', exact: true })).toBeEnabled();
  await page.getByLabel('支出項目', { exact: true }).fill('公車');
  await page.getByLabel('支出金額', { exact: true }).fill('1200');
  const save = page.getByRole('button', { name: '儲存支出', exact: true });

  await expect(save).toBeDisabled();
  release();
  await expect(page.getByRole('combobox', { name: /分類/ })).toHaveValue('交通');
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  expect(
    (await world.db.query('SELECT category_id FROM expenses WHERE owner_id=$1', [identity.id]))
      .rows,
  ).toEqual([{ category_id: transport.id }]);
});

test('an unresolved save keeps its original preferred category when the available list changes', async ({
  page,
  world,
}) => {
  const transport = await seedCategory(world, '交通'),
    identity = await login(page, world);

  await page.goto('/trips');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: `travel-ledger:last-category:${identity.id}`,
    value: transport.id,
  });
  let posts = 0;

  await page.route('**/api/trips/*/expenses', async (route) => {
    if (route.request().method() === 'POST') {
      posts++;
      await route.abort('failed');
    } else await route.continue();
  });
  await page.route('**/api/trips/*/expenses/*', (route) => route.abort('failed'));
  await openExpenseForm(page, world);
  const combo = page.getByRole('combobox', { name: /分類/ });

  await expect(combo).toHaveValue('交通');
  await page.getByLabel('支出項目', { exact: true }).fill('車票');
  await page.getByLabel('支出金額', { exact: true }).fill('1200');
  await page.getByRole('button', { name: '儲存支出', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '保存結果尚未確認' })).toBeVisible();
  expect((await callApi(world, 'DELETE', `/api/categories/${transport.id}`)).status()).toBe(204);
  const refreshed = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/categories' && response.status() === 200,
  );

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    window.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    window.dispatchEvent(new Event('visibilitychange'));
  });
  expect((await (await refreshed).json()).items).toEqual([]);
  await expect(combo).toHaveValue('交通');
  await expect(combo).toBeDisabled();
  await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeDisabled();
  expect(posts).toBe(1);
  expect(
    (
      await world.db.query('SELECT count(*)::int AS count FROM expenses WHERE owner_id=$1', [
        identity.id,
      ])
    ).rows[0].count,
  ).toBe(0);
});

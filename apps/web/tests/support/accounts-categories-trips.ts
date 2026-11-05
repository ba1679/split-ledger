import type { Page } from '@playwright/test';
import type { LedgerWorld } from './fixtures.js';
import { expect } from './fixtures.js';
import { seedIdentity, seedTrip, seedCategory, seedExpense, callApi } from '../../../api/tests/support/seed.js';
import { login, openTrip, openExpenseForm } from './browser.js';

export { seedIdentity, seedTrip, seedCategory, seedExpense, callApi, login, openTrip, openExpenseForm };
export type Context = { page: Page; world: LedgerWorld };
export type Row = Record<string, unknown> & { id: string; name?: string };

export async function rows(world: LedgerWorld, table: 'trips' | 'categories' | 'expenses', owner = '甲') {
  const user = await seedIdentity(world, owner);
  return (await world.db.query<Row>(`SELECT * FROM ${table} WHERE owner_id = $1 ORDER BY id`, [user.id])).rows;
}

export async function named(world: LedgerWorld, table: 'trips' | 'categories', name: string, owner = '甲') {
  const result = (await rows(world, table, owner)).find(row => row.name === name);
  expect(result, `${owner} has ${table} ${name}`).toBeDefined();
  return result!;
}

export async function apiItems(world: LedgerWorld, path: string, owner = '甲'): Promise<Row[]> {
  const response = await callApi(world, 'GET', path, undefined, owner);
  expect(response.status()).toBe(200);
  return (await response.json() as { items: Row[] }).items;
}

export async function snapshot(world: LedgerWorld) {
  world.set('category:before', await rows(world, 'categories'));
  world.set('expense:before', await rows(world, 'expenses'));
}

export async function categoriesPage(page: Page, world: LedgerWorld) {
  await login(page, world);
  await page.goto('/categories');
  await expect(page.getByRole('button', { name: '新增分類', exact: true })).toBeVisible();
  await apiItems(world, '/api/categories');
}

export async function arrangeCategories(page: Page, world: LedgerWorld, names: string[]) {
  for (const name of names) await seedCategory(world, name);
  await snapshot(world);
  await categoriesPage(page, world);
}

export async function arrangeSharedExpenses(page: Page, world: LedgerWorld, category: string, classified = true) {
  await seedCategory(world, category);
  for (const [tripName, item] of [['日本旅行', '午餐'], ['台南旅行', '晚餐']]) {
    await seedTrip(world, tripName!);
    await seedExpense(world, { tripName: tripName!, item: item!, amount: '1200', currencyCode: 'JPY', spentOn: '2027-03-11', ...(classified ? { categoryName: category } : {}) });
  }
  await snapshot(world);
  await categoriesPage(page, world);
}

export async function categoryCreate(page: Page, world: LedgerWorld, name: string) {
  world.set('category:input', name);
  await page.getByRole('button', { name: '新增分類', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('分類名稱', { exact: true }).fill(name);
  await dialog.getByRole('button', { name: /^(儲存|保存|建立分類)$/ }).click();
}

export async function categoryRename(page: Page, name: string) {
  await page.getByRole('button', { name: '改名：餐飲', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('分類名稱', { exact: true }).fill(name);
  await dialog.getByRole('button', { name: /^(儲存|保存|保存分類)$/ }).click();
}

export async function assertCategoriesUnchanged(world: LedgerWorld) {
  expect(await rows(world, 'categories')).toEqual(world.get('category:before'));
  const visible = await apiItems(world, '/api/categories');
  expect(visible.map(row => ({ id: row.id, name: row.name })).sort((a, b) => a.id.localeCompare(b.id)))
    .toEqual((world.get<Row[]>('category:before')).map(row => ({ id: row.id, name: row.name })).sort((a, b) => a.id.localeCompare(b.id)));
}

export async function assertExpensesUnchanged(world: LedgerWorld) {
  expect(await rows(world, 'expenses')).toEqual(world.get('expense:before'));
  for (const trip of await rows(world, 'trips')) {
    const response = await apiItems(world, `/api/trips/${trip.id}/expenses`);
    const original = world.get<Row[]>('expense:before').filter(row => row.trip_id === trip.id);
    expect(response.map(row => row.id).sort()).toEqual(original.map(row => row.id).sort());
  }
}

export async function assertSharedClassification(page: Page, world: LedgerWorld, name: string) {
  const original = world.get<Row[]>('expense:before');
  const category = await named(world, 'categories', name);
  const expenses = await rows(world, 'expenses');
  expect(expenses).toEqual(original);
  expect(expenses).toHaveLength(2);
  expect(new Set(expenses.map(row => row.trip_id)).size).toBe(2);
  expect(expenses.every(row => row.category_id === category.id)).toBe(true);
  for (const tripName of ['日本旅行', '台南旅行']) {
    await openTrip(page, world, tripName);
    const trip = await named(world, 'trips', tripName);
    const items = await apiItems(world, `/api/trips/${trip.id}/expenses`);
    expect(items).toHaveLength(1);
    expect(items[0]?.category).toEqual({ id: category.id, name });
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
}

export async function categoryPreference(page: Page, world: LedgerWorld, id: string | null) {
  const user = await seedIdentity(world);
  await login(page, world);
  await seedTrip(world, '日本旅行');
  await page.goto('/trips');
  await page.evaluate(({ key, value }) => {
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  }, { key: `travel-ledger:last-category:${user.id}`, value: id });
  world.set('expense:before', await rows(world, 'expenses'));
  const otherCategory = await seedCategory(world, '他人的分類', '乙');
  const other = await seedIdentity(world, '乙');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: `travel-ledger:last-category:${other.id}`, value: otherCategory.id });
}

export async function chooseCategory(page: Page, name: string) {
  await page.getByRole('combobox', { name: /分類/ }).click();
  await page.getByRole('option', { name, exact: true }).click();
}

export async function clearAndSave(page: Page) {
  await chooseCategory(page, '未分類');
  await page.getByRole('button', { name: /^(儲存支出|保存支出)$/ }).click();
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
}

export async function assertUnclassified(page: Page, world: LedgerWorld, item = '午餐') {
  const current = (await rows(world, 'expenses')).filter(row => row.item === item);
  expect(current).toHaveLength(1);
  expect(current[0]?.category_id).toBeNull();
  const original = world.get<Row[]>('expense:before');
  const originalExpense = original.find(row => row.item === item);
  if (originalExpense) {
    expect(current[0]).toEqual({ ...originalExpense, category_id: null, updated_at: current[0]?.updated_at });
  } else {
    const saved = (await world.db.query('SELECT item, amount_minor::text, currency_code, minor_unit, spent_on::text FROM expenses WHERE id=$1', [current[0]?.id])).rows[0];
    expect(saved).toEqual({ item, amount_minor: '1200', currency_code: 'JPY', minor_unit: 0, spent_on: '2027-03-11' });
  }
  const trip = await named(world, 'trips', '日本旅行');
  const apiExpense = (await apiItems(world, `/api/trips/${trip.id}/expenses`)).find(row => row.id === current[0]?.id);
  expect(apiExpense?.category).toBeNull();
  const user = await seedIdentity(world);
  expect(await page.evaluate(key => localStorage.getItem(key), `travel-ledger:last-category:${user.id}`)).toBeNull();
  await expect(page.getByRole('link').filter({ hasText: item }).getByText('未分類', { exact: true })).toBeVisible();
}

export async function tripCreate(page: Page, name: string, start: string | null = null, end: string | null = null) {
  await page.getByRole('button', { name: '新增旅行', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('旅行名稱', { exact: true }).fill(name);
  if (start) await dialog.getByLabel('開始日', { exact: true }).fill(start.replaceAll('-', '/'));
  if (end) await dialog.getByLabel('結束日', { exact: true }).fill(end.replaceAll('-', '/'));
  await dialog.getByRole('button', { name: '建立旅行', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

export async function tripEnd(page: Page, date: string) {
  await page.getByRole('button', { name: '旅行日期', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('結束日', { exact: true }).fill(date.replaceAll('-', '/'));
  await dialog.getByRole('button', { name: /^(儲存日期|保存日期)$/ }).click();
}

export async function assertTrip(world: LedgerWorld, name: string, startDate: string | null, endDate: string | null) {
  const trip = await named(world, 'trips', name);
  const row = (await world.db.query('SELECT owner_id,start_date::text,end_date::text FROM trips WHERE id=$1', [trip.id])).rows[0];
  expect(row).toEqual({ owner_id: world.users.get('甲')!.id, start_date: startDate, end_date: endDate });
  const detailResponse = await callApi(world, 'GET', `/api/trips/${trip.id}`);
  expect(detailResponse.status()).toBe(200);
  const detail = await detailResponse.json();
  expect(detail).toMatchObject({ id: trip.id, name, startDate, endDate });
  expect((await apiItems(world, '/api/trips')).find(item => item.id === trip.id)).toMatchObject({ name, startDate, endDate });
  return detail as Row;
}

export async function assertAccount(page: Page, world: LedgerWorld, label: string) {
  const expected = await seedIdentity(world, label);
  const response = await page.request.get('/api/me');
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ id: expected.id, name: expected.name });
  for (const table of ['trips', 'categories'] as const) {
    const visibleResponse = await page.request.get(`/api/${table}`);
    expect(visibleResponse.status()).toBe(200);
    const visible = (await visibleResponse.json() as { items: Row[] }).items;
    const authoritative = await rows(world, table, label);
    expect(visible.map(row => row.id).sort()).toEqual(authoritative.map(row => row.id).sort());
  }
}

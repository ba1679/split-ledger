import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from './fixtures.js';
import { login } from './browser.js';
import { seedCategory, seedExpense, seedTrip } from '../../../api/tests/support/seed.js';

const directory = new URL('../../../../.cache/ui-review/', import.meta.url);
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: new URL(`${info.project.name}-${name}.png`, directory).pathname, fullPage: true });
}
async function fits(page: Page) {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
  expect.soft(dimensions.width, 'Document must fit its viewport without horizontal scrolling').toBeLessThanOrEqual(dimensions.viewport);
}

test('five approved pages at phone, tablet and desktop widths', async ({ page, world }, info) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/'); await expect(page.getByRole('button', { name: '使用 Google 帳號登入' })).toBeVisible();
    await capture(page, info, `login-${width}`); await fits(page);
  }
  const trip = await seedTrip(world, '日本春日旅行', '甲', { startDate: '2027-03-10', endDate: '2027-03-15' });
  await seedTrip(world, '台南的慢週末', '甲', { startDate: '2027-04-03', endDate: '2027-04-05' });
  for (const name of ['餐飲', '住宿', '交通', '購物']) await seedCategory(world, name);
  await seedExpense(world, { tripName: trip.name, item: '往返機票', amount: '8000', currencyCode: 'TWD', spentOn: '2027-01-15', categoryName: '交通' });
  await seedExpense(world, { tripName: trip.name, item: '京都町家住宿', amount: '15000', currencyCode: 'JPY', categoryName: '住宿' });
  await seedExpense(world, { tripName: trip.name, item: '巷口的拉麵店', amount: '2000', currencyCode: 'JPY', categoryName: '餐飲' });
  await login(page, world);
  const pages = [
    { name: 'trips', path: '/trips', ready: () => page.getByRole('heading', { name: '日本春日旅行', exact: true }) },
    { name: 'trip', path: `/trips/${trip.id}`, ready: () => page.getByRole('link').filter({ hasText: '京都町家住宿' }) },
    { name: 'expense', path: `/trips/${trip.id}/expenses/new`, ready: () => page.getByRole('combobox', { name: '幣別', exact: true }) },
    { name: 'categories', path: '/categories', ready: () => page.getByRole('button', { name: '改名：餐飲', exact: true }) },
  ];
  for (const screen of pages) for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await page.goto(screen.path);
    await expect(screen.ready()).toBeVisible();
    if (screen.name === 'expense') await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeEnabled();
    await capture(page, info, `${screen.name}-${width}`); await fits(page);
  }
});

test('long names and large original-currency totals remain readable', async ({ page, world }, info) => {
  const name = 'W'.repeat(100), trip = await seedTrip(world, name);
  await seedExpense(world, { tripName: name, item: 'W'.repeat(100), amount: '9223372036854775807', currencyCode: 'JPY' });
  await seedExpense(world, { tripName: name, item: '最高金額第二筆', amount: '9223372036854775807', currencyCode: 'JPY' });
  await seedExpense(world, { tripName: name, item: '最大美金', amount: '92233720368547758.07', currencyCode: 'USD' });
  await login(page, world);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await page.goto(`/trips/${trip.id}`);
    await expect(page.getByRole('group', { name: 'JPY', exact: true })).toContainText('18,446,744,073,709,551,614');
    await capture(page, info, `long-trip-${width}`); await fits(page);
    await page.goto(`/trips/${trip.id}/expenses/new`);
    await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeEnabled();
    await capture(page, info, `long-backlink-${width}`); await fits(page);
  }
});

test('real list loading, transport error, retry and missing-trip return remain usable', async ({ page, world }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const trip = await seedTrip(world, '載入後的旅行'); await login(page, world);
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/trips', async route => { await wait; await route.continue(); });
  await page.goto('/trips'); await expect(page.getByRole('status')).toContainText('正在整理你的旅程');
  await capture(page, info, 'loading-375'); await fits(page); release();
  await expect(page.getByRole('heading', { name: trip.name })).toBeVisible();
  await page.unroute('**/api/trips');
  await page.route('**/api/trips', route => route.abort('failed'));
  await page.reload(); await expect(page.getByRole('alert')).toContainText('暫時無法取得帳本');
  await expect(page.getByRole('alert')).toContainText('連線');
  await expect(page.getByRole('alert')).not.toContainText(/failed to fetch|load failed|fetch failed/i);
  await capture(page, info, 'error-375'); await fits(page);
  await page.unroute('**/api/trips'); await page.getByRole('button', { name: '重新嘗試', exact: true }).click();
  await expect(page.getByRole('heading', { name: trip.name })).toBeVisible();
  await page.goto(`/trips/${randomUUID()}`); await expect(page.getByRole('alert')).toBeVisible();
  await capture(page, info, 'missing-trip-375');
  await page.locator('main').getByRole('link', { name: '我的旅行', exact: true }).click();
  await expect(page.getByRole('heading', { name: trip.name })).toBeVisible();
});

test('capture approved static prototype layouts for direct review', async ({ page }, info) => {
  const prototype = new URL('../../../../specs/plans/001-personal-travel-expenses/ui/', import.meta.url);
  for (const [name, path] of [['login', 'index.html'], ['trips', 'trips.html'], ['trip', 'trip.html?id=japan'], ['expense', 'expense.html?trip=japan'], ['categories', 'categories.html']] as const) {
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(new URL(path, prototype).href);
      await expect(page.locator('h1')).toBeVisible();
      await capture(page, info, `approved-${name}-${width}`);
    }
  }
});

test('empty, offline, pending, unknown and confirmed-save feedback is visible and announced', async ({ page, world }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const trip = await seedTrip(world, '空白旅行'); await login(page, world);
  await page.goto(`/trips/${trip.id}`);
  await expect(page.getByRole('link', { name: '記錄第一筆支出', exact: true })).toBeVisible();
  await capture(page, info, 'empty-trip-375');
  await page.getByRole('link', { name: '記錄第一筆支出', exact: true }).click();
  const item = page.getByLabel('支出項目', { exact: true }), save = page.getByRole('button', { name: '儲存支出', exact: true });
  await expect(save).toBeEnabled(); await item.fill('沿途的咖啡'); await page.getByLabel('金額', { exact: true }).fill('1200');
  await page.context().setOffline(true); await save.click();
  await expect(page.getByRole('alert')).toContainText('目前無法連線');
  await capture(page, info, 'offline-draft-375'); await expect(item).toBeEditable(); await fits(page);
  await page.context().setOffline(false);
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/api/trips/${trip.id}/expenses`, async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch(); await wait; await route.fulfill({ response });
  });
  try {
    await save.click(); await expect(page.getByRole('button', { name: '儲存中…', exact: true })).toBeDisabled();
    await expect(item).toBeDisabled(); await capture(page, info, 'saving-375');
  } finally { release(); }
  await expect(page.getByRole('status')).toHaveText('支出已保存');
  await capture(page, info, 'saved-status-375');
  await page.unroute(`**/api/trips/${trip.id}/expenses`);
  await page.getByRole('link', { name: '記一筆', exact: true }).click();
  await expect(save).toBeEnabled(); await item.fill('另一杯咖啡'); await page.getByLabel('金額', { exact: true }).fill('800');
  await page.route(`**/api/trips/${trip.id}/expenses/*`, route => route.abort('failed'));
  await page.route(`**/api/trips/${trip.id}/expenses`, async route => {
    if (route.request().method() !== 'POST') return route.continue();
    expect((await route.fetch()).status()).toBe(201); await route.abort('failed');
  });
  await save.click();
  await expect(page.getByRole('alert')).toHaveText('保存結果尚未確認，請重新整理確認。');
  await expect(save).toBeDisabled(); await expect(item).toHaveValue('另一杯咖啡');
  await capture(page, info, 'unconfirmed-draft-375'); await fits(page);
  await page.unroute(`**/api/trips/${trip.id}/expenses/*`);
  await page.getByRole('button', { name: '重新查證', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('支出已保存');
  expect((await world.db.query('SELECT item FROM expenses WHERE trip_id=$1 ORDER BY item', [trip.id])).rows).toEqual([{ item: '另一杯咖啡' }, { item: '沿途的咖啡' }]);
});

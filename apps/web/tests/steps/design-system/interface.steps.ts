import type { Locator } from '@playwright/test';
import { Given, When, Then, expect } from '../../support/fixtures.js';
import { login, rows, seedTrip, type Row } from '../../support/accounts-categories-trips.js';

Given('使用者已登入且旅行清單資料尚未返回', async ({ page, world }) => {
  await login(page, world);
  await page.route('**/api/trips', async (route) => {
    await page.waitForEvent('close', { timeout: 0 });
    await route.abort().catch(() => undefined);
  });
});

Given('使用者已登入且旅行清單暫時無法讀取', async ({ page, world }) => {
  await seedTrip(world, '日本旅行');
  await login(page, world);
  world.set('tripsBeforeFailure', await rows(world, 'trips'));
  await page.route('**/api/trips', (route) => route.abort('failed'));
});

Given('使用者已登入且在 {string} 載入旅行清單', async ({ page, world }, device: string) => {
  const width = device === '電腦' ? 1440 : device === '手機' ? 375 : undefined;
  if (!width) throw new Error(`未知裝置：${device}`);
  await page.setViewportSize({ width, height: 1000 });
  await login(page, world);
  await page.goto('/trips');
  await expect(page.getByRole('heading', { name: '旅程，從第一本帳本開始。' })).toBeVisible();
});

When('使用者開啟旅行清單', async ({ page }) => {
  await page.goto('/trips');
});

Then('畫面告知旅行清單正在載入', async ({ page }) => {
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('正在整理你的旅程');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

Then('畫面說明讀取失敗並提供重新嘗試入口', async ({ page, world }) => {
  const error = page.getByRole('alert');
  await expect(error).toBeVisible();
  await expect(error).toContainText('暫時無法取得帳本');
  await expect(error).toContainText('連線');
  await expect(error).not.toContainText(/failed to fetch|load failed|fetch failed/i);
  await expect(error.getByRole('button', { name: '重新嘗試', exact: true })).toBeEnabled();
  expect(await rows(world, 'trips')).toEqual(world.get<Row[]>('tripsBeforeFailure'));
});

When('使用者重新嘗試讀取旅行清單', async ({ page }) => {
  await page.unroute('**/api/trips');
  await page.getByRole('button', { name: '重新嘗試', exact: true }).click();
});

Then('旅行清單恢復顯示既有旅行', async ({ page, world }) => {
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await rows(world, 'trips')).toEqual(world.get<Row[]>('tripsBeforeFailure'));
});

When('使用者以鍵盤開啟新增旅行表單', async ({ page, world }) => {
  const trigger = page.getByRole('button', { name: '新增旅行', exact: true });
  for (
    let tab = 0;
    tab < 30 && !(await trigger.evaluate((el) => el === document.activeElement));
    tab++
  ) {
    await page.keyboard.press('Tab');
  }
  await expect(trigger).toBeFocused();
  world.set('designSystemDialogTrigger', trigger);
  await page.keyboard.press('Enter');
});

Then('焦點進入新增旅行表單，欄位與操作有可理解名稱', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: '新增旅行' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: '旅行名稱' })).toBeFocused();
  await expect(dialog.getByRole('textbox', { name: /開始日/ })).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: /結束日/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '取消', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: '建立旅行', exact: true })).toBeEnabled();
});

When('使用者以鍵盤關閉新增旅行表單', async ({ page }) => {
  await page.keyboard.press('Escape');
});

Then('焦點回到新增旅行操作', async ({ page, world }) => {
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(world.get<Locator>('designSystemDialogTrigger')).toBeFocused();
});

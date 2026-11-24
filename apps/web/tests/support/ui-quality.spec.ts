import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures.js';
import { login } from './browser.js';
import { assertSpinnerOnly } from './loading/spinner-result.js';
import { seedCategory, seedExpense, seedTrip } from '../../../api/tests/support/seed.js';

async function fits(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
  }));

  expect
    .soft(dimensions.width, 'Document must fit its viewport without horizontal scrolling')
    .toBeLessThanOrEqual(dimensions.viewport);
}

test('main pages remain usable at phone, tablet and desktop widths', async ({ page, world }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: '使用 Google 帳號登入' })).toBeVisible();

    await fits(page);
  }
  const trip = await seedTrip(world, '日本春日旅行', '甲', {
    startDate: '2027-03-10',
    endDate: '2027-03-15',
  });

  await seedTrip(world, '台南的慢週末', '甲', { startDate: '2027-04-03', endDate: '2027-04-05' });
  for (const name of ['餐飲', '住宿', '交通', '購物']) await seedCategory(world, name);
  await seedExpense(world, {
    tripName: trip.name,
    item: '往返機票',
    amount: '8000',
    currencyCode: 'TWD',
    spentOn: '2027-01-15',
    categoryName: '交通',
  });
  await seedExpense(world, {
    tripName: trip.name,
    item: '京都町家住宿',
    amount: '15000',
    currencyCode: 'JPY',
    categoryName: '住宿',
  });
  await seedExpense(world, {
    tripName: trip.name,
    item: '巷口的拉麵店',
    amount: '2000',
    currencyCode: 'JPY',
    categoryName: '餐飲',
  });
  await login(page, world);
  const pages = [
    {
      name: 'trips',
      path: '/trips',
      ready: () => page.getByRole('heading', { name: '日本春日旅行', exact: true }),
    },
    {
      name: 'trip',
      path: `/trips/${trip.id}`,
      ready: () => page.getByRole('link').filter({ hasText: '京都町家住宿' }),
    },
    {
      name: 'expense',
      path: `/trips/${trip.id}/expenses/new`,
      ready: () => page.getByRole('combobox', { name: '幣別', exact: true }),
    },
    {
      name: 'categories',
      path: '/categories',
      ready: () => page.getByRole('button', { name: '改名：餐飲', exact: true }),
    },
  ];
  for (const screen of pages)
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(screen.path);
      await expect(screen.ready()).toBeVisible();
      if (screen.name === 'expense')
        await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeEnabled();

      await fits(page);
    }
});

test('long names and large original-currency totals remain readable', async ({ page, world }) => {
  const name = 'W'.repeat(100),
    trip = await seedTrip(world, name);

  await seedExpense(world, {
    tripName: name,
    item: 'W'.repeat(100),
    amount: '9223372036854775807',
    currencyCode: 'JPY',
  });
  await seedExpense(world, {
    tripName: name,
    item: '最高金額第二筆',
    amount: '9223372036854775807',
    currencyCode: 'JPY',
  });
  await seedExpense(world, {
    tripName: name,
    item: '最大美金',
    amount: '92233720368547758.07',
    currencyCode: 'USD',
  });
  await login(page, world);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/trips/${trip.id}`);
    await expect(page.getByRole('group', { name: 'JPY', exact: true })).toContainText(
      '18,446,744,073,709,551,614',
    );

    await fits(page);
    await page.goto(`/trips/${trip.id}/expenses/new`);
    await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeEnabled();

    await fits(page);
  }
});

test('missing trip offers a working return to the trip list', async ({ page, world }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const trip = await seedTrip(world, '載入後的旅行');
  await login(page, world);
  await page.goto(`/trips/${randomUUID()}`);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.locator('main').getByRole('link', { name: '我的旅行', exact: true }).click();
  await expect(page.getByRole('heading', { name: trip.name })).toBeVisible();
  await fits(page);
});

test('empty, offline, pending, unknown and confirmed-save feedback is visible and announced', async ({
  page,
  world,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const trip = await seedTrip(world, '空白旅行');

  await login(page, world);
  await page.goto(`/trips/${trip.id}`);
  await expect(page.getByRole('link', { name: '記錄第一筆支出', exact: true })).toBeVisible();

  await page.getByRole('link', { name: '記錄第一筆支出', exact: true }).click();
  const item = page.getByLabel('支出項目', { exact: true }),
    save = page.getByRole('button', { name: '儲存支出', exact: true });

  await expect(save).toBeEnabled();
  await item.fill('沿途的咖啡');
  await page.getByLabel('支出金額', { exact: true }).fill('1200');
  await page.context().setOffline(true);
  await save.click();
  await expect(page.getByRole('alert')).toContainText('目前無法連線');

  await expect(item).toBeEditable();
  await fits(page);
  await page.context().setOffline(false);
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route(`**/api/trips/${trip.id}/expenses`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();

    const response = await route.fetch();

    await wait;
    await route.fulfill({ response });
  });

  try {
    const before = await save.boundingBox();

    await save.click();
    await expect(save).toBeDisabled();
    await expect(save).toHaveAccessibleName('儲存支出');
    await expect(save).toHaveAttribute('aria-busy', 'true');
    const spinner = save.getByRole('status', { name: '正在處理儲存支出', exact: true });

    await assertSpinnerOnly(spinner, /^正在處理儲存支出$/);
    await expect(save.locator('svg')).toBeVisible();
    await expect(save.getByText('儲存支出', { exact: true })).toHaveCSS('opacity', '0');
    const during = await save.boundingBox();

    expect(during!.width).toBe(before!.width);
    expect(during!.height).toBe(before!.height);
    await expect(item).toBeDisabled();
  } finally {
    release();
  }
  await expect(page.getByRole('status').filter({ hasText: /^支出已保存$/ })).toHaveText(
    '支出已保存',
  );

  await page.unroute(`**/api/trips/${trip.id}/expenses`);
  await page.getByRole('link', { name: '記一筆', exact: true }).click();
  await expect(save).toBeEnabled();
  await item.fill('另一杯咖啡');
  await page.getByLabel('支出金額', { exact: true }).fill('800');
  await page.route(`**/api/trips/${trip.id}/expenses/*`, (route) => route.abort('failed'));
  await page.route(`**/api/trips/${trip.id}/expenses`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();

    expect((await route.fetch()).status()).toBe(201);
    await route.abort('failed');
  });
  await save.click();
  await expect(page.getByRole('alert')).toHaveText('保存結果尚未確認，請重新整理確認。');
  await expect(save).toBeDisabled();
  await expect(item).toHaveValue('另一杯咖啡');

  await fits(page);
  await page.unroute(`**/api/trips/${trip.id}/expenses/*`);
  await page.getByRole('button', { name: '重新查證', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^支出已保存$/ })).toHaveText(
    '支出已保存',
  );
  expect(
    (await world.db.query('SELECT item FROM expenses WHERE trip_id=$1 ORDER BY item', [trip.id]))
      .rows,
  ).toEqual([{ item: '另一杯咖啡' }, { item: '沿途的咖啡' }]);
});

test('Google login text stays readable on hover and keyboard focus', async ({ page }) => {
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const button = page.getByRole('button', { name: '使用 Google 帳號登入', exact: true });
    const contrast = () =>
      button.evaluate((element) => {
        const style = getComputedStyle(element);
        const luminance = (color: string) => {
          const channels = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((value) => {
              const channel = value / 255;

              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            });

          if (channels.length !== 3) throw new Error('Expected an RGB color');

          return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
        };
        const text = luminance(style.color),
          background = luminance(style.backgroundColor);

        return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
      });

    await expect(button).toBeVisible();
    await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
    await button.hover();
    // Wait for the background transition to reach its final color.
    await expect.poll(() => button.evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
    await page.mouse.move(0, 0);
    for (
      let tab = 0;
      tab < 10 && !(await button.evaluate((el) => el === document.activeElement));
      tab++
    ) {
      await page.keyboard.press('Tab');
    }
    await expect(button).toBeFocused();
    await expect.poll(() => button.evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
  }
});

import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';

for (const width of [375, 1280])
  test(`owner overview, navigation, aligned money fields and stable switch at ${width}px`, async ({
    page,
    world,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '午餐', 幣別: 'KRW', 金額: '30000', 付款人: 'Alice', 分攤者: 'Alice、Amy' },
      { 項目: '麵包', 幣別: 'KRW', 金額: '10000', 付款人: 'Alice', 分攤者: 'Alice' },
      { 項目: '機票', 幣別: 'TWD', 金額: '15000', 付款人: 'Alice', 分攤者: 'Alice' },
    ]);
    const tripId = splittingTripId(world);
    await page.goto(`/trips/${tripId}`);
    await expect(page.getByText('個人總花費 · 依幣別分開統計', { exact: true })).toBeVisible();
    const totals = page.getByRole('region', { name: '分幣別總額', exact: true });

    await expect(totals.getByRole('group', { name: 'KRW', exact: true })).toContainText('25,000');
    await expect(totals.getByRole('group', { name: 'TWD', exact: true })).toContainText('15,000');
    const lunch = page.getByRole('link', { name: /午餐/ });

    await expect(lunch).toContainText('30,000');
    await expect(lunch).not.toContainText('Alice');
    await expect(lunch).not.toContainText('Amy');
    await expect(lunch.getByRole('list', { name: '支出分攤' })).toHaveCount(0);
    await page.screenshot({
      path: `.cache/feedback-2026-11-11/${testInfo.project.name}-${width}-overview.png`,
      fullPage: true,
    });
    await lunch.click();
    await expect(page.getByRole('list', { name: '支出分攤' })).toBeVisible();
    const amount = await page.getByLabel('金額', { exact: true }).boundingBox();
    const currency = await page.getByRole('combobox', { name: '幣別', exact: true }).boundingBox();

    expect(amount).not.toBeNull();
    expect(currency).not.toBeNull();
    expect(Math.abs(amount!.y - currency!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(amount!.height - currency!.height)).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `.cache/feedback-2026-11-11/${testInfo.project.name}-${width}-expense.png`,
      fullPage: true,
    });
    await page.goto(`/trips/${tripId}/members`);
    const nav = page.getByRole('navigation', {
      name: width === 375 ? '行動導覽' : '主要導覽',
      exact: true,
    });

    await expect(nav.getByRole('link', { name: '同行者', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
    if (width === 1280) {
      const parent = await nav.getByRole('link', { name: '我的旅行', exact: true }).boundingBox();
      const child = await nav.getByRole('link', { name: '同行者', exact: true }).boundingBox();
      const categories = await nav
        .getByRole('link', { name: '支出分類', exact: true })
        .boundingBox();

      expect(child!.x).toBeGreaterThan(parent!.x);
      expect(child!.y).toBeLessThan(categories!.y);
    }
    await page.goto(`/trips/${tripId}/settlement`);
    const toggle = page.getByRole('switch', { name: '簡化付款', exact: true });

    await expect(toggle).toBeEnabled();
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pattern = `**/api/trips/${tripId}`;

    await page.route(pattern, async (route) => {
      if (route.request().method() === 'PATCH') await gate;
      await route.continue();
    });
    const panel = page.locator('.simplification-panel');
    const before = await panel.boundingBox();
    try {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-busy', 'true');
      await expect(toggle).toBeDisabled();
      const during = await panel.boundingBox();

      expect(during!.height).toBe(before!.height);
      const busy = panel.getByRole('status', { name: '正在更新簡化付款', exact: true });

      await expect(busy).toBeVisible();
      await expect(busy).toHaveText('');
      await expect(toggle).toHaveAccessibleName('簡化付款');
      const spinner = busy.locator('svg');

      await expect(spinner).toBeVisible();
      const spinnerBox = await spinner.boundingBox();
      const toggleBox = await toggle.boundingBox();

      expect(spinnerBox!.width).toBeGreaterThanOrEqual(16);
      expect(spinnerBox!.height).toBeGreaterThanOrEqual(16);
      expect(
        Math.abs(spinnerBox!.x + spinnerBox!.width / 2 - toggleBox!.x - toggleBox!.width / 2),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(spinnerBox!.y + spinnerBox!.height / 2 - toggleBox!.y - toggleBox!.height / 2),
      ).toBeLessThanOrEqual(1);
      const track = await toggle.locator('.switch-track').boundingBox();

      expect(track!.height).toBe(24);
      expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    } finally {
      release();
    }
    await expect(toggle).toBeChecked();
    await expect(toggle).toBeEnabled();
    await page.unroute(pattern);
    await page.screenshot({
      path: `.cache/feedback-2026-11-11/${testInfo.project.name}-${width}-settlement.png`,
      fullPage: true,
    });
    await page.getByRole('link', { name: '結清', exact: true }).click();
    await expect(page.getByLabel('實付金額', { exact: true })).toHaveValue('15000');
    await expect(page.getByLabel('實付金額', { exact: true })).toBeEditable();
    await page.screenshot({
      path: `.cache/feedback-2026-11-11/${testInfo.project.name}-${width}-prefill.png`,
      fullPage: true,
    });
    await page.getByLabel('實付金額', { exact: true }).fill('2000');
    await page.getByRole('button', { name: '記錄部分還款', exact: true }).click();
    const saved = page.getByRole('status').filter({ hasText: '已記錄部分還款' });

    await expect(saved).toContainText('實付 KRW 2,000');
    await expect(saved).toContainText('尚欠 KRW 13,000');
    await expect(saved).toContainText('尚未結清');
    await expect(page.getByText(/結清成功/)).toHaveCount(0);
    expect(
      (await world.db.query('SELECT kind FROM repayments WHERE trip_id=$1', [tripId])).rows,
    ).toEqual([{ kind: 'independent' }]);
    expect(
      (await world.db.query('SELECT id FROM settlements WHERE trip_id=$1', [tripId])).rows,
    ).toEqual([]);
    await page.screenshot({
      path: `.cache/feedback-2026-11-11/${testInfo.project.name}-${width}-partial.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });

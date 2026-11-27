import { seedTrip } from '../../../../api/tests/support/seed.js';
import { goToTripList, openAppSettings, tripEditor } from '../home-navigation.js';
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
    await expect(page.getByRole('heading', { name: '個人花費', exact: true })).toBeVisible();
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
    const amount = await page.getByLabel('支出金額', { exact: true }).boundingBox();
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
      expect(child!.x).toBeGreaterThan(parent!.x);
      await expect(nav.getByRole('link', { name: '支出分類', exact: true })).toHaveCount(0);
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

const japanExpenses = [
  { item: '共同拉麵', day: 15, amount: '2000' },
  { item: '車站咖啡', day: 15, amount: '540' },
  { item: '京都到大阪', day: 14, amount: '850' },
  { item: '抹茶冰淇淋', day: 14, amount: '460' },
  { item: '美術館門票', day: 13, amount: '1200' },
  { item: '錦市場點心', day: 13, amount: '680' },
  { item: '京都町家住宿', day: 12, amount: '15000' },
  { item: '京都市巴士', day: 12, amount: '390' },
  { item: '旅遊手冊', day: 11, amount: '900' },
  { item: '植物園套票', day: 11, amount: '2200' },
  { item: '機場接駁', day: 10, amount: '600' },
  { item: '往返機票', day: 10, amount: '8000', currency: 'TWD' },
];

for (const width of [390, 1440]) {
  test(`trip ledger overview and fixed entry at ${width}px`, async ({ page, world }, testInfo) => {
    const mobile = width === 390;
    await page.setViewportSize({ width, height: mobile ? 844 : 900 });
    await seedBrowserSplittingExpenses(
      page,
      world,
      japanExpenses.map(({ item, amount, currency }) => ({
        項目: item,
        幣別: currency ?? 'JPY',
        金額: amount,
        付款人: 'Alice',
        分攤者: item === '共同拉麵' ? 'Alice、Amy' : 'Alice',
      })),
    );
    await seedTrip(world, '台南的慢週末', '甲', {
      startDate: '2027-04-03',
      endDate: '2027-04-05',
    });
    const tripId = splittingTripId(world);
    await world.db.query(
      "UPDATE trips SET name='日本春日旅行',start_date='2027-03-10',end_date='2027-03-15' WHERE id=$1",
      [tripId],
    );
    for (const { item, day } of japanExpenses) {
      await world.db.query('UPDATE expenses SET spent_on=$3 WHERE trip_id=$1 AND item=$2', [
        tripId,
        item,
        `2027-03-${day}`,
      ]);
    }
    const path = `/trips/${tripId}`;
    const screenshot = (state: string) =>
      page.screenshot({
        path: `.cache/008-overview/${testInfo.project.name}-${width}-${state}.png`,
      });
    await page.goto(path);
    const add = page.getByRole('link', { name: '記一筆', exact: true });
    const spending = page.getByRole('region', { name: '個人花費摘要' });
    const balances = page.getByRole('region', { name: '應收應付摘要' });
    const expenses = page.getByRole('region', { name: '支出清單' });
    const navigation = page.getByRole('navigation', { name: mobile ? '行動導覽' : '主要導覽' });
    await expect(spending.getByRole('group', { name: 'JPY' })).toContainText('23,820');
    await expect(balances.getByText('TWD 已平衡')).toBeVisible();
    await expect(expenses.getByRole('link')).toHaveCount(12);
    await expect(add).toHaveCount(1);
    const first = (await spending.boundingBox())!;
    const second = (await balances.boundingBox())!;
    if (mobile) {
      expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
      await expect(navigation.getByRole('button', { name: '登出' })).toHaveCount(0);
    } else {
      expect(second.x).toBeGreaterThanOrEqual(first.x + first.width);
      expect(second.y).toBe(first.y);
      await expect(navigation.getByRole('link', { name: '旅行總覽' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    }
    await screenshot('overview');
    await expect(page.getByRole('button', { name: '全站設定' })).toHaveCount(0);
    await expect(tripEditor(page, '日本春日旅行')).toHaveCount(0);
    await goToTripList(page);
    await expect(page.locator('main').getByRole('link', { name: '垃圾桶' })).toHaveAttribute(
      'href',
      '/trips/trash',
    );
    await screenshot('home');
    const manage = tripEditor(page, '日本春日旅行');
    await manage.focus();
    await manage.press('Enter');
    const dates = page.getByRole('menuitem', { name: '編輯旅行日期' });
    await expect(dates).toBeFocused();
    await screenshot('trip-settings');
    await dates.press('Enter');
    await page.getByRole('dialog').getByRole('button', { name: '取消' }).click();
    await expect(manage).toBeFocused();

    const otherManage = tripEditor(page, '台南的慢週末');
    await otherManage.click();
    await page.getByRole('menuitem', { name: '編輯旅行日期' }).click();
    await expect(page.getByRole('dialog').getByLabel('旅行名稱')).toHaveValue('台南的慢週末');
    await page.keyboard.press('Escape');
    await expect(otherManage).toBeFocused();

    const settings = await openAppSettings(page);
    await expect(settings.getByRole('link', { name: '支出分類' })).toHaveAttribute(
      'href',
      '/categories',
    );
    await screenshot('app-settings');
    const language = settings.getByRole('button', { name: /^語系/ });
    await language.click();
    await expect(settings.getByRole('menuitemradio', { name: '繁體中文' })).toBeChecked();
    await expect(settings.getByRole('menuitemradio', { name: 'English' })).toBeVisible();
    await screenshot('language-options');
    await language.press('Escape');
    await expect(settings).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '全站設定' })).toBeFocused();
    await page.locator(`a.trip-card[href="${path}"]`).click();

    if (!mobile) {
      for (const label of ['同行者', '分帳結算']) {
        await navigation.getByRole('link', { name: label }).click();
        await navigation.getByRole('link', { name: '旅行總覽' }).click();
        await expect(page).toHaveURL(new RegExp(path + '$'));
      }
    }

    await spending.getByRole('link', { name: '看分析' }).click();
    await expect(page).toHaveURL(new RegExp(path + '/analysis$'));
    await page.goBack();
    await expect(expenses.getByRole('link')).toHaveCount(12);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expect(add).toBeInViewport();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    if (mobile) {
      const last = (await expenses.getByRole('link').last().boundingBox())!;
      const bar = (await navigation.boundingBox())!;
      expect(last.y + last.height).toBeLessThanOrEqual(bar.y);
    } else {
      await expect(page.getByRole('region', { name: '旅行資料' })).toHaveAttribute(
        'data-compact',
        'true',
      );
    }
    await screenshot('scroll');
    await add.click();
    await expect(page).toHaveURL(new RegExp(path + '/expenses/new$'));

    if (mobile) {
      const longName = '日本春日旅行北海道京都大阪奈良瀨戶內海交通與住宿共同記帳';
      await world.db.query('UPDATE trips SET name=$2 WHERE id=$1', [tripId, longName]);
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(path);
      await expect(page.getByRole('heading', { name: longName })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
      await expect(add).toBeInViewport();
      await (await openAppSettings(page)).getByRole('button', { name: '登出' }).click();
      await expect(page.getByRole('button', { name: /使用 Google 帳號登入/ })).toBeVisible();
    }
  });
}

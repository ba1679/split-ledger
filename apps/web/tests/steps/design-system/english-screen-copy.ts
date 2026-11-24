import type { Page } from '@playwright/test';
import { seedCategory, seedTrip } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { Given, Then, When, expect } from '../../support/fixtures.js';
import { login } from '../../support/browser.js';
import { setBrowserLanguages } from '../../support/browser-languages.js';
import {
  readBrowserSplittingSnapshot,
  seedBrowserSplittingExpenses,
  type BrowserSplittingSnapshot,
} from '../../support/splitting/fixture.js';

const screenKey = '008:english-screen';
const snapshotKey = '008:english-screen-before';

const targets = {
  旅行清單: { route: () => '/trips', ready: '.trip-card' },
  垃圾桶: { route: () => '/trips/trash', ready: '.trash-card' },
  旅行帳本: { route: (base: string) => base, ready: '.expense-row' },
  支出列表: { route: (base: string) => base, ready: '.expense-row' },
  支出詳情: { route: (base: string) => base, ready: '.expense-form .money-input' },
  同行者管理: { route: (base: string) => `${base}/members`, ready: 'main form input' },
  分類管理: { route: () => '/categories', ready: '.category-row' },
  分類分析: { route: (base: string) => `${base}/analysis`, ready: '.analysis-cards' },
  圖表明細: { route: (base: string) => `${base}/analysis`, ready: '.analysis-cards' },
  結算: { route: (base: string) => `${base}/settlement`, ready: '.arrangement-row' },
  還款: { route: (base: string) => `${base}/repayments/new`, ready: 'main form input' },
} as const;

type ExistingScreen = keyof typeof targets;
const han = /\p{Script=Han}/u;
const demoTrip = '日本旅行';
const essentialCopy: Record<ExistingScreen, readonly RegExp[]> = {
  旅行清單: [/my trips/iu, /(?:new|create|add) (?:a )?trip/iu],
  垃圾桶: [/trash/iu, /restore/iu],
  旅行帳本: [/add an expense/iu, /spending analysis/iu, /companions/iu, /settle/iu],
  支出列表: [/\b1 expense\b/iu, /uncategorized/iu],
  支出詳情: [/expense/iu, /amount/iu, /share|split/iu],
  同行者管理: [/companions|members/iu, /name/iu, /add/iu],
  分類管理: [/categories/iu, /add|create/iu],
  分類分析: [/spending analysis/iu, /my share by category/iu],
  圖表明細: [/category|uncategorized/iu, /amount|JPY/iu],
  結算: [/settle/iu, /payment|payable/iu],
  還款: [
    /record a separate payment/iu,
    /recipient/iu,
    /amount paid/iu,
    /payment date/iu,
    /save payment/iu,
  ],
};

async function expectEnglishApplicationText(page: Page, screen: ExistingScreen): Promise<void> {
  const visible = page.locator(
    'main:visible, .sidebar:visible, .bottom-nav:visible, [role=dialog]:visible',
  );
  const copy = (await visible.allInnerTexts()).join('\n').replaceAll(demoTrip, '').trim();
  const targetCopy = screen === '圖表明細' ? await page.getByRole('dialog').innerText() : copy;
  for (const label of essentialCopy[screen]) expect(targetCopy).toMatch(label);
  expect(copy).not.toMatch(han);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
}

Given(
  '使用者以英文介面登入且 {string} 已有可查看的資料',
  async ({ page, world }, screen: ExistingScreen) => {
    expect(Object.hasOwn(targets, screen)).toBe(true);
    await setBrowserLanguages(page.context(), ['en']);
    await seedBrowserSplittingExpenses(page, world, [
      {
        項目: 'Train tickets',
        幣別: 'JPY',
        金額: '100',
        付款人: 'Alice',
        分攤者: 'Alice、Bob、Amy',
      },
    ]);
    await seedCategory(world, 'Transport');
    if (screen === '垃圾桶') {
      const trash = await seedTrip(world, 'Old trip');
      const result = await world.db.query(
        'UPDATE trips SET deleted_at=now(), lifecycle_revision=1 WHERE id=$1 AND owner_id=$2',
        [trash.id, trash.owner_id],
      );
      expect(result.rowCount).toBe(1);
    }
    const base = `/trips/${splittingTripId(world)}`;
    world.set(screenKey, screen);
    world.set(snapshotKey, await readBrowserSplittingSnapshot(world));
    if (screen === '支出詳情') {
      await page.goto(base);
      await expect(page.locator('.expense-row')).toBeVisible();
    }
    if (screen === '圖表明細') {
      await page.goto(targets[screen].route(base));
      await expect(page.locator('.analysis-details button').first()).toBeVisible();
    }
  },
);

When('使用者開啟 {string}', async ({ page, world }, screen: ExistingScreen) => {
  expect(screen).toBe(world.get(screenKey));
  const base = `/trips/${splittingTripId(world)}`;
  const target = targets[screen];
  if (screen === '支出詳情') await page.locator('.expense-row').click();
  else if (screen === '圖表明細') await page.locator('.analysis-details button').first().click();
  else await page.goto(target.route(base));
  await expect(page.locator(target.ready).first()).toBeVisible();
  if (screen === '支出詳情') await expect(page.locator('.money-input')).toHaveValue('100');
  if (screen === '圖表明細') await expect(page.getByRole('dialog')).toBeVisible();
});

Then('{string} 的旅帳自有可見文字以英文呈現', async ({ page, world }, screen: ExistingScreen) => {
  expect(screen).toBe(world.get(screenKey));
  await expectEnglishApplicationText(page, screen);
  if (screen === '支出詳情') {
    await expect(page.locator('.expense-share-list output')).toHaveText([
      'JPY 33.33',
      'JPY 33.33',
      'JPY 33.33',
    ]);
  }
  expect(await readBrowserSplittingSnapshot(world)).toEqual(
    world.get<BrowserSplittingSnapshot>(snapshotKey),
  );
});

Given('使用者以英文介面開啟尚無支出的花費分析頁', async ({ page, world }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setBrowserLanguages(page.context(), ['en']);
  await login(page, world);
  const trip = await seedTrip(world, demoTrip);
  world.set('008:empty-analysis-trip', trip.id);
  await page.goto(`/trips/${trip.id}/analysis`);
  await expect(page.getByRole('heading', { name: 'No spending to analyze yet' })).toBeVisible();
});

When('使用者從分析空畫面選擇新增支出', async ({ page }) => {
  await page.getByRole('link', { name: 'Add an expense', exact: true }).click();
});

Then('旅帳開啟同一趟旅行的英文新增支出表單', async ({ page, world }) => {
  const tripId = world.get<string>('008:empty-analysis-trip');
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/expenses/new$`, 'u'));
  await expect(page.getByRole('heading', { name: 'Add an expense', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Expense item' })).toBeVisible();
});

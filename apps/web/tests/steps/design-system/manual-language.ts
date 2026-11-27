import { openAppSettings } from '../../support/home-navigation.js';
import type { Page } from '@playwright/test';
import { Given, When, Then, expect, test } from '../../support/fixtures.js';
import { login, mockGoogle } from '../../support/browser.js';
import { setBrowserLanguages } from '../../support/browser-languages.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { seedSplittingExpenses } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
} from '../../support/splitting/fixture.js';
import {
  arrangeLostResponse,
  repaymentFixtureKey,
  type RepaymentStatusFixture,
} from '../../support/splitting/repayment-status-008.js';

const languageKey = 'split-ledger.interface-language';
const viewport =
  process.env.SL008_LANGUAGE_WIDTH === '1440'
    ? 1440
    : process.env.SL008_LANGUAGE_WIDTH === '320'
      ? 320
      : 390;

async function prepareViewport(page: Page) {
  await page.setViewportSize({ width: viewport, height: viewport === 1440 ? 900 : 844 });
}

async function capture(page: Page, name: string) {
  if (process.env.SL008_LANGUAGE_EVIDENCE)
    await page.screenshot({ path: test.info().outputPath(name + '.png'), animations: 'disabled' });
}

async function expectLanguage(page: Page, language: 'en' | 'zh-Hant') {
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  await expect(page).toHaveTitle(language === 'en' ? 'Travel Ledger' : '旅帳');
}

async function chooseLanguage(page: Page, name: string) {
  const pathname = new URL(page.url()).pathname;
  if (pathname !== '/' && pathname !== '/trips') {
    const home = await page.context().newPage();
    try {
      await home.setViewportSize(page.viewportSize()!);
      await home.goto(new URL('/trips', page.url()).href);
      await chooseLanguage(home, name);
      await expectLanguage(page, name === 'English' ? 'en' : 'zh-Hant');
    } finally {
      await home.close();
    }

    return;
  }
  if (pathname === '/trips') await openAppSettings(page);
  const trigger = page.getByRole('button', { name: /^(Language|語言|語系)/u });
  await expect(trigger).toHaveCount(1);
  await trigger.click();
  const menu = page.getByRole('menu', { name: /^(Language|語言|語系)$/u });
  await expect(menu.getByRole('menuitemradio')).toHaveCount(2);
  await expect(menu.getByRole('menuitemradio', { checked: true })).toHaveCount(1);
  await expect(menu).toBeInViewport({ ratio: 1 });
  const bounds = await menu.boundingBox();
  if (!bounds) throw Error('Expected a visible language menu');
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport);
  await capture(page, 'language-menu');
  await menu.getByRole('menuitemradio', { name, exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(trigger).toContainText(name);
}

async function openChineseLogin(page: Page) {
  await prepareViewport(page);
  await setBrowserLanguages(page.context(), ['zh-TW']);
  await page.goto('/');
  await expect(page.getByRole('button', { name: '使用 Google 帳號登入' })).toBeVisible();
}

async function expectLedger(page: Page, language: 'en' | 'zh-Hant', tripId: string) {
  await expectLanguage(page, language);
  await expect(page).toHaveURL(new RegExp('/trips/' + tripId + '$', 'u'));
  await expect(page.getByRole('heading', { name: '日本旅行' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: language === 'en' ? 'Add an expense' : '記一筆' }),
  ).toBeVisible();
}

Given('首選中文的瀏覽器開啟繁中登入頁', async ({ page }) => {
  await openChineseLogin(page);
});

async function prepareEnglishLogin(page: Page, world: Parameters<typeof login>[1]) {
  const trip = await seedTrip(world, '日本旅行');
  world.set('language:trip-id', trip.id);
  await mockGoogle(page, world);
  await openChineseLogin(page);
  await chooseLanguage(page, 'English');
}

async function googleSignIn(page: Page) {
  await page.getByRole('button', { name: /Google/u }).click();
  await expect(page).toHaveURL(/\/trips$/u);
}

Given('首選中文的瀏覽器已在登入頁手動選英文', async ({ page, world }) => {
  await prepareEnglishLogin(page, world);
});

Given('使用者已從英文登入頁登入且旅行清單為英文', async ({ page, world }) => {
  await prepareEnglishLogin(page, world);
  await googleSignIn(page);
});

async function openEnglishLedger(page: Page, world: Parameters<typeof login>[1]) {
  await prepareViewport(page);
  await setBrowserLanguages(page.context(), ['en-US']);
  await seedSplittingExpenses(world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
  ]);
  await login(page, world);
  await page.goto('/trips/' + splittingTripId(world));
  await expectLedger(page, 'en', splittingTripId(world));
  world.set('language:original-ledger', await readBrowserSplittingSnapshot(world));
}

Given('首選英文的瀏覽器已登入並開啟英文帳本', async ({ page, world }) => {
  await openEnglishLedger(page, world);
});
Given('首選英文的瀏覽器已在帳本手動選繁中', async ({ page, world }) => {
  await openEnglishLedger(page, world);
  await chooseLanguage(page, '繁體中文');
});

When('使用者從語言選單選擇 {string}', async ({ page }, language) => {
  await chooseLanguage(page, language);
});
Then('同一登入頁以英文呈現', async ({ page }) => {
  await expect(page).toHaveURL(/\/$/u);
  await expectLanguage(page, 'en');
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await capture(page, 'login-english');
});
When('使用者透過 Google 登入旅帳', async ({ page }) => {
  await googleSignIn(page);
});
Then('登入後的旅行清單沿用英文', async ({ page }) => {
  await expectLanguage(page, 'en');
  await expect(page.getByRole('region', { name: 'Trip list', exact: true })).toBeVisible();
});
When('使用者開啟清單上的旅行', async ({ page }) => {
  await page.getByRole('link', { name: /日本旅行/u }).click();
});
Then('帳本沿用登入前所選的英文', async ({ page, world }) => {
  await expectLedger(page, 'en', world.get<string>('language:trip-id'));
});
Then('原帳本以繁中呈現且帳務保持一致', async ({ page, world }) => {
  await expectLedger(page, 'zh-Hant', splittingTripId(world));
  await expect(page.getByText('車票', { exact: true })).toBeVisible();
  expect(await readBrowserSplittingSnapshot(world)).toEqual(
    world.get<BrowserSplittingSnapshot>('language:original-ledger'),
  );
  await capture(page, 'ledger-chinese');
});
When('使用者重整帳本頁面', async ({ page }) => {
  await page.reload();
});
When('使用者從新分頁再次開啟原帳本', async ({ page, world }) => {
  const context = page.context();
  const next = await context.newPage();
  const url = new URL(page.url());
  await next.goto(url.origin + '/trips/' + splittingTripId(world), {
    waitUntil: 'domcontentloaded',
  });
  world.set('language:reopened', next);
});
Then('原帳本仍使用繁中', async ({ page, world }) => {
  const reopened = world.state.get('language:reopened') as Page | undefined;
  await expectLedger(reopened ?? page, 'zh-Hant', splittingTripId(world));
});

async function signOut(page: Page) {
  await (await openAppSettings(page)).getByRole('button', { name: '登出', exact: true }).click();
  await expect(page).toHaveURL(/\/$/u);
}

When('使用者登出旅帳', async ({ page }) => {
  await signOut(page);
});
Then('登出後回到繁中登入頁', async ({ page }) => {
  await expectLanguage(page, 'zh-Hant');
  await expect(page.getByRole('button', { name: '使用 Google 帳號登入' })).toBeVisible();
});
Given('使用者已登出並回到手動選擇的繁中登入頁', async ({ page, world }) => {
  await openEnglishLedger(page, world);
  await chooseLanguage(page, '繁體中文');
  await signOut(page);
  await mockGoogle(page, world);
});
Then('登入後的旅行清單沿用繁中', async ({ page }) => {
  await expectLanguage(page, 'zh-Hant');
  await expect(page.getByRole('region', { name: '旅行清單', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /日本旅行/u })).toBeVisible();
});
When('使用者清除旅帳手動語言偏好後重開登入頁', async ({ page }) => {
  await page.evaluate((key) => localStorage.removeItem(key), languageKey);
  await page.reload();
});
Then('同一登入頁恢復以繁中呈現', async ({ page }) => {
  await expectLanguage(page, 'zh-Hant');
  await expect(page.getByRole('button', { name: '使用 Google 帳號登入' })).toBeVisible();
  await capture(page, 'login-chinese');
});

async function preparePendingRepayment(page: Page, world: Parameters<typeof login>[1]) {
  await prepareViewport(page);
  await arrangeLostResponse(page, world, false, false);
  await expect(page.getByRole('heading', { name: '儲存結果待確認' })).toBeVisible();
  await page.getByRole('button', { name: '查看結果' }).scrollIntoViewIfNeeded();
}

Given('原還款結果待確認且保留草稿', async ({ page, world }) => {
  await preparePendingRepayment(page, world);
});
Then('英文查證畫面保留原草稿及還款識別', async ({ page, world }) => {
  const fixture = world.get<RepaymentStatusFixture>(repaymentFixtureKey);
  await expectLanguage(page, 'en');
  await expect(page).toHaveURL(
    new RegExp('/trips/' + splittingTripId(world) + '/repayments/new$', 'u'),
  );
  await expect(fixture.form).toHaveAttribute('data-command-id', fixture.id!);
  await expect(fixture.form.getByLabel('Amount paid', { exact: true })).toHaveValue('100');
  await expect(fixture.form.getByRole('textbox', { name: 'Payment date' })).toHaveValue(
    '2027/03/12',
  );
  await expect(fixture.form.locator('select').nth(0)).toHaveValue(fixture.from);
  await expect(fixture.form.locator('select').nth(1)).toHaveValue(fixture.to);
  await expect(
    fixture.form.getByRole('heading', { name: 'Payment status unconfirmed' }),
  ).toBeVisible();
  await expect(fixture.form.getByRole('button', { name: 'Check status' })).toBeVisible();
  expect(fixture.writes).toHaveLength(1);
  expect(fixture.reads).toEqual([`${fixture.path}/${fixture.id}`]);
  await capture(page, 'repayment-pending-english');
});
Given('原還款待確認畫面已切換英文且可重新查證', async ({ page, world }) => {
  await preparePendingRepayment(page, world);
  await chooseLanguage(page, 'English');
  world.get<RepaymentStatusFixture>(repaymentFixtureKey).allowRecovery();
});
When('使用者查看原還款結果', async ({ page }) => {
  await page.getByRole('button', { name: 'Check status' }).click();
});
Then('查證原還款成功且只寫入一次', async ({ page, world }) => {
  const fixture = world.get<RepaymentStatusFixture>(repaymentFixtureKey);
  await expect(page.getByText('Payment recorded', { exact: true })).toBeVisible();
  await expect(fixture.form).toBeHidden();
  expect(fixture.reads).toEqual(Array(2).fill(`${fixture.path}/${fixture.id}`));
  expect(fixture.writes).toHaveLength(1);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(fixture.after);
});

Given('繁中支出草稿已有名稱且金額驗證未通過', async ({ page, world }) => {
  await prepareViewport(page);
  await setBrowserLanguages(page.context(), ['zh-TW']);
  const trip = await seedTrip(world, '日本旅行');
  await login(page, world);
  await page.goto('/trips/' + trip.id + '/expenses/new');
  world.set('language:expense-url', page.url());
  await page.getByRole('textbox', { name: '支出項目', exact: true }).fill('旅途車票');
  await page.getByRole('button', { name: '儲存支出', exact: true }).click();
  await expect(page.getByText('請輸入符合幣別位數且大於零的正數金額。')).toBeVisible();
});

Then('同一支出表單以英文顯示原驗證訊息並保留草稿', async ({ page, world }) => {
  await expectLanguage(page, 'en');
  await expect(page).toHaveURL(world.get<string>('language:expense-url'));
  await expect(page.getByRole('textbox', { name: 'Expense item', exact: true })).toHaveValue(
    '旅途車票',
  );
  await expect(page.getByRole('textbox', { name: 'Amount', exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(
    page.getByText('Enter an amount greater than zero with the allowed decimal places.'),
  ).toBeVisible();
});

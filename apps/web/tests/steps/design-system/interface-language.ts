import type { Page } from '@playwright/test';
import { Given, Then, When, expect } from '../../support/fixtures.js';
import { seedSplittingExpenses } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { login } from '../../support/browser.js';
import { setBrowserLanguages } from '../../support/browser-languages.js';
import {
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
} from '../../support/splitting/fixture.js';

const preferenceKey = 'split-ledger.interface-language';
const han = /\p{Script=Han}/u;
const writes = new WeakMap<Page, string[]>();

async function observeFirstLanguage(page: Page, selector: string): Promise<void> {
  await page.addInitScript((selector) => {
    const result: { lang: string; text: string }[] = [];
    Object.defineProperty(window, '__ledgerFirstText', { value: result });
    const observer = new MutationObserver(() => {
      const parts = Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter((node) => node.getClientRects().length > 0)
        .map((node) => node.innerText.trim())
        .filter(Boolean);
      if (parts.length) result.push({ lang: document.documentElement.lang, text: parts.join(' ') });
    });
    observer.observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
  }, selector);
}

async function expectFirstLanguage(page: Page, language: 'en' | 'zh-Hant'): Promise<void> {
  const frames = await page.evaluate(
    () =>
      (window as unknown as { __ledgerFirstText: { lang: string; text: string }[] })
        .__ledgerFirstText,
  );
  expect(frames.length).toBeGreaterThan(0);
  for (const { lang, text } of frames) {
    expect(lang).toBe(language);
    if (language === 'en') expect(text).not.toMatch(han);
    else expect(text).toMatch(han);
  }
}

Given('瀏覽器沒有有效的旅帳手動語言偏好且首選語言為 {string}', async ({ page }, primary) => {
  const languages =
    primary === 'ja，次選 zh-TW' ? ['ja', 'zh-TW'] : primary === '無法辨識' ? [] : [primary];
  await setBrowserLanguages(page.context(), languages);
});

Given('使用者已登入且瀏覽器首選日文、次選中文，沒有有效手動語言偏好', async ({ page, world }) => {
  await setBrowserLanguages(page.context(), ['ja', 'zh-TW']);
  await seedSplittingExpenses(world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
  ]);
  await login(page, world);
  world.set('language:ledgerBefore', await readBrowserSplittingSnapshot(world));
});

Given(
  '瀏覽器首選 {string} 且已儲存手動選擇的 {string}',
  async ({ page, world }, primary, selected) => {
    await setBrowserLanguages(page.context(), [primary]);
    await page.context().addInitScript(
      ({ origin, key, language }) => {
        if (location.origin === origin) localStorage.setItem(key, language);
      },
      {
        origin: world.get<string>('webOrigin'),
        key: preferenceKey,
        language: selected === '繁中' ? 'zh-Hant' : 'en',
      },
    );
  },
);

async function openLoginFirstScreen(page: Page): Promise<void> {
  const mutations: string[] = [];
  writes.set(page, mutations);
  page.on('request', (request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      /^(POST|PATCH|PUT|DELETE)$/u.test(request.method())
    )
      mutations.push(request.url());
  });
  await observeFirstLanguage(page, '.login h1, .login h2, .login button');
  await page.goto('/');
  await expect(page.locator('.login h2')).toBeVisible();
}

When('使用者開啟旅帳登入頁', async ({ page }) => {
  await openLoginFirstScreen(page);
});

When('使用者直接開啟自己的旅行帳本', async ({ page, world }) => {
  await observeFirstLanguage(page, 'a[href$="/expenses/new"], a[href$="/settlement"]');
  const tripId = splittingTripId(world);
  await page.goto(`/trips/${tripId}`);
  await expect(page.getByRole('heading', { name: '日本旅行' })).toBeVisible();
});

When('使用者再次開啟旅帳登入頁', async ({ page, world }) => {
  const nextPage = await page.context().newPage();
  world.set('language:loginPage', nextPage);
  await openLoginFirstScreen(nextPage);
});

Then('旅帳首屏以 {string} 呈現', async ({ page, world }, expected) => {
  const visiblePage = (world.state.get('language:loginPage') as Page | undefined) ?? page;
  const language = expected === '英文' ? 'en' : 'zh-Hant';
  await expectFirstLanguage(visiblePage, language);
  await expect(visiblePage.locator('html')).toHaveAttribute('lang', language);
  const google = visiblePage.locator('.login').getByRole('button', { name: /Google/u });
  await expect(google).toBeVisible();
  if (language === 'en') await expect(google).not.toHaveText(han);
  else await expect(google).toHaveText(han);
  expect(writes.get(visiblePage)).toEqual([]);
});

Then('旅帳首屏以英文呈現原帳本', async ({ page, world }) => {
  await expectFirstLanguage(page, 'en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const trip = splittingTripId(world);
  expect(new URL(page.url()).pathname).toBe(`/trips/${trip}`);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(
    world.get<BrowserSplittingSnapshot>('language:ledgerBefore'),
  );
});

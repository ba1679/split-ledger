import type { Locator, Page } from '@playwright/test';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { login } from '../../support/browser.js';
import { setBrowserLanguages } from '../../support/browser-languages.js';
import { Given, Then, When, expect } from '../../support/fixtures.js';
import {
  readBrowserSplittingSnapshot,
  seedBrowserSplittingExpenses,
} from '../../support/splitting/fixture.js';
import {
  arrangeLostResponse,
  arrangeRepaymentDraft,
  rejectRepayment,
  submitRejectedRepayment,
} from '../../support/splitting/repayment-status-008.js';

const statusKey = '008:english-status';
const han = /\p{Script=Han}/u;

interface PreparedStatus {
  area: Locator;
  expected: readonly RegExp[];
  unchanged?: () => Promise<void>;
}

function unchangedLedger(
  world: LedgerWorld,
  before: Awaited<ReturnType<typeof readBrowserSplittingSnapshot>>,
) {
  return async () => expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}

async function prepareEnglishStatus(
  page: Page,
  world: LedgerWorld,
  screen: string,
  status: string,
): Promise<PreparedStatus> {
  if (screen === '還款表單' && status === '儲存結果待確認') {
    const fixture = await arrangeLostResponse(page, world, false, false, 'en');
    const area = fixture.form.locator('.repayment-warning');
    await expect(area.locator('button')).toBeEnabled();

    return {
      area,
      expected: [/Payment status unconfirmed/u, /Check status/u],
      unchanged: async () => {
        expect(fixture.writes).toHaveLength(1);
        await expect(fixture.form).toHaveAttribute('data-command-id', fixture.id!);
        await unchangedLedger(world, fixture.after)();
      },
    };
  }
  if (screen === '還款表單' && status === '明確儲存失敗') {
    const draft = await arrangeRepaymentDraft(page, world, 'en');
    await rejectRepayment(page, draft.path);
    await submitRejectedRepayment(page, draft);

    return {
      area: draft.form.locator('p.error[role=alert]:not([id])'),
      expected: [/changed|updated|failed/iu, /review|reload|refresh|try again/iu],
      unchanged: unchangedLedger(world, draft.before),
    };
  }

  await setBrowserLanguages(page.context(), ['en']);
  if (screen === '登入頁' && status === '初始狀態') {
    await page.goto('/');

    return {
      area: page.locator('.login-box'),
      expected: [/google/iu, /sign in|log in|continue/iu],
    };
  }
  if (screen === '旅行清單' && status === '空狀態') {
    await login(page, world);
    const load = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/trips' && response.request().method() === 'GET',
    );
    await page.goto('/trips');
    const response = await load;
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ items: [] });

    return {
      area: page.locator('main .empty'),
      expected: [/create|start|add/iu, /trip|journey/iu],
      unchanged: async () => {
        const trips = await callApi(world, 'GET', '/api/trips');
        expect(await trips.json()).toMatchObject({ items: [] });
      },
    };
  }

  await seedBrowserSplittingExpenses(page, world, [
    { 項目: 'Train tickets', 幣別: 'JPY', 金額: '900', 付款人: 'Alice', 分攤者: 'Alice、Bob' },
  ]);
  const base = `/trips/${splittingTripId(world)}`;
  const before = await readBrowserSplittingSnapshot(world);
  const unchanged = unchangedLedger(world, before);
  if (screen === '新增支出表單' && status === '必填欄位錯誤') {
    await page.goto(`${base}/expenses/new`);
    const form = page.locator('form.expense-form');
    const save = form.getByRole('button', { name: /^(儲存支出|save expense|save)$/iu });
    await expect(save).toBeEnabled();
    await save.click();

    return {
      area: form.locator('input[required] + p.error').first(),
      expected: [/enter|provide|required/iu, /expense|item|description/iu],
      unchanged,
    };
  }
  if (screen === '分類分析' && status === '載入中') {
    const release = Promise.withResolvers<void>();
    const pending = Promise.withResolvers<void>();
    page.once('close', () => release.resolve());
    await page.route(`**/api${base}/expense-analysis`, async (route) => {
      pending.resolve();
      await release.promise;
      await route.continue();
    });
    await page.goto(`${base}/analysis`);
    await pending.promise;

    return {
      area: page.locator('.analysis-page .query-skeleton'),
      expected: [/loading|reading/iu, /analysis|spending/iu],
      unchanged,
    };
  }
  throw new Error(`Unknown screen state: ${screen} / ${status}`);
}

Given(
  '使用者以英文介面開啟 {string} 且目前為 {string}',
  async ({ page, world }, screen: string, status: string) => {
    const prepared = await prepareEnglishStatus(page, world, screen, status);
    await expect(prepared.area).toBeVisible();
    world.set(statusKey, { ...prepared, status });
  },
);

When('使用者查看目前畫面', async ({ world }) => {
  const prepared = world.get<PreparedStatus>(statusKey);
  await expect(prepared.area).toBeVisible();
});

Then('旅帳自有的 {string} 文字與可採取的下一步以英文呈現', async ({ world }, status: string) => {
  const prepared = world.get<PreparedStatus & { status: string }>(statusKey);
  expect(prepared.status).toBe(status);
  const copy = await prepared.area.innerText();
  expect(copy).not.toMatch(han);
  for (const text of prepared.expected) expect(copy).toMatch(text);
  await prepared.unchanged?.();
});

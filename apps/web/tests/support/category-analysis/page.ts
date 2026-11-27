import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  analysisContext,
  analysisSnapshot,
} from '../../../../api/tests/support/category-analysis/fixture.js';
import {
  expectedChart,
  type Source,
  type OracleCurrency,
} from '../../../../api/tests/support/category-analysis/oracle.js';

export interface BrowserAnalysisReply {
  tripId: string;
  ownerMemberId: string;
  hasSharedExpenses: boolean;
  currencies: OracleCurrency[];
}

export function analysisCard(page: Page, kind: string) {
  return page.getByRole('region', { name: kind === '個人' ? '個人花費' : '團體花費', exact: true });
}

export function analysisCurrency(page: Page) {
  return page.getByRole('combobox', { name: '統計幣別', exact: true });
}

export function checkBrowserAnalysisSource(
  world: LedgerWorld,
  body: BrowserAnalysisReply,
  source: Source,
) {
  const c = analysisContext(world);
  expect(body.tripId).toBe(c.tripId);
  expect(body.ownerMemberId).toBe(c.ownerMemberId);
  const codes = [...new Set(source.expenses!.map((e) => String(e.currency_code)))].sort();
  expect(body.currencies.map((c) => c.currencyCode)).toEqual(codes);
  for (const row of body.currencies)
    expect(row.minorUnit).toBe(
      Math.max(
        ...source
          .expenses!.filter((e) => e.currency_code === row.currencyCode)
          .map((e) => Number(e.minor_unit)),
      ),
    );
  for (const row of body.currencies)
    for (const kind of ['personal', 'group'] as const)
      expect(row[kind]).toEqual(expectedChart(source, c.ownerMemberId!, row.currencyCode, kind));
  expect(body.hasSharedExpenses).toBe(
    source.expenses!.some(
      (e) =>
        new Set(source.shares!.filter((s) => s.expense_id === e.id).map((s) => s.member_id)).size >=
        2,
    ),
  );
}

export async function analysisUISnapshot(page: Page) {
  return Promise.all(
    ['個人', '團體'].map(async (kind) => {
      const card = analysisCard(page, kind);
      if (!(await card.count())) return { kind, missing: true };

      return {
        kind,
        details: await card.locator('.analysis-details').allTextContents(),
        total: await card.locator('.analysis-total').allTextContents(),
        paths: await card
          .locator('.recharts-sector')
          .evaluateAll((nodes) =>
            nodes.map((n) => ({ d: n.getAttribute('d'), fill: n.getAttribute('fill') })),
          ),
      };
    }),
  );
}

export async function openConfirmedBrowserAnalysis(page: Page, world: LedgerWorld) {
  const c = analysisContext(world),
    before = await analysisSnapshot(world);
  const link = page.getByRole('link', { name: '看分析', exact: true });
  await expect(link, 'Product ledger must expose the approved analysis entry').toBeVisible();
  const responsePromise = page.waitForResponse(
    (r) => new URL(r.url()).pathname === `/api/trips/${c.tripId}/expense-analysis`,
  );
  await link.click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const body = (await response.json()) as BrowserAnalysisReply;
  checkBrowserAnalysisSource(world, body, before);
  await expect(page).toHaveURL(new RegExp(`/trips/${c.tripId}/analysis$`));
  await expect(page.getByRole('heading', { name: '花費分析', exact: true })).toBeVisible();
  if (body.currencies.length) {
    await expect(analysisCard(page, '個人')).toBeVisible();
    await expect(analysisCurrency(page)).toBeVisible();
    await expect
      .poll(async () => {
        const first = JSON.stringify(await analysisUISnapshot(page));
        await page.evaluate(
          () =>
            new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
        );

        return JSON.stringify(await analysisUISnapshot(page)) === first;
      })
      .toBe(true);
  }
  world.set('analysis:uiReply', body);
  world.set('analysis:uiSource', before);
  expect(await analysisSnapshot(world)).toEqual(before);

  if (body.currencies.length)
    await assertSelectedBrowserSnapshot(page, world, await analysisCurrency(page).inputValue());

  if (!body.currencies.length) {
    const { assertEmptyAnalysisSuccess } = await import('./state-assertions.js');
    await assertEmptyAnalysisSuccess(page, world);
  }

  return body;
}

export async function confirmPreviousBrowserAnalysis(page: Page, world: LedgerWorld) {
  const body = await openConfirmedBrowserAnalysis(page, world);
  world.set('analysis:confirmedReply', body);
  world.set('analysis:confirmedSource', await analysisSnapshot(world));
  world.set('analysis:confirmedUI', await analysisUISnapshot(page));
  await page.getByRole('link', { name: /返回.*帳本|旅行帳本/ }).click();
  await expect(page).toHaveURL(new RegExp(`/trips/${analysisContext(world).tripId}$`));
}

export async function selectBrowserAnalysisCurrency(
  page: Page,
  world: LedgerWorld,
  currency: string,
) {
  const reads = world.get<string[]>('analysis:requests').length;
  const body = world.get<BrowserAnalysisReply>('analysis:uiReply');
  expect(body.currencies.some((c) => c.currencyCode === currency)).toBe(true);
  await analysisCurrency(page).selectOption(currency);
  await expect(analysisCurrency(page)).toHaveValue(currency);
  world.set('analysis:selectedCurrency', currency);
  await assertSelectedBrowserSnapshot(page, world, currency);
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
  expect(world.get<string[]>('analysis:requests').length).toBe(reads);
  world.set('analysis:selectedUI', await analysisUISnapshot(page));
  expect(await analysisSnapshot(world)).toEqual(world.get('analysis:uiSource'));
}

export async function retainBrowserAnalysisCurrency(
  page: Page,
  world: LedgerWorld,
  currency: string,
) {
  await openConfirmedBrowserAnalysis(page, world);
  await selectBrowserAnalysisCurrency(page, world, currency);
  world.set('analysis:confirmedReply', world.get('analysis:uiReply'));
  world.set('analysis:confirmedUI', await analysisUISnapshot(page));
  await page.getByRole('link', { name: /返回.*帳本|旅行帳本/ }).click();
  await expect(page).toHaveURL(new RegExp(`/trips/${analysisContext(world).tripId}$`));
}

export function categoryControl(page: Page, kind: string, category: string) {
  return analysisCard(page, kind)
    .getByRole('button')
    .filter({ has: page.getByText(category, { exact: true }) });
}

export async function openBrowserCategoryInfo(
  page: Page,
  world: LedgerWorld,
  kind: string,
  category: string,
  key = 'Enter',
) {
  const control = categoryControl(page, kind, category);
  await control.focus();
  await control.press(key);
  await expect(page.getByRole('dialog', { name: '分類資訊', exact: true })).toBeVisible();
  world.set('analysis:trigger', control);
  world.set('analysis:triggerKind', kind);
  world.set('analysis:triggerCategory', category);
  const b = world.get<BrowserAnalysisReply>('analysis:uiReply'),
    currency = await analysisCurrency(page).inputValue(),
    row = b.currencies.find((c) => c.currencyCode === currency)!;
  expect(
    row[kind === '個人' ? 'personal' : 'group'].categories.some(
      (c) => (c.category?.name ?? '未分類') === category,
    ),
  ).toBe(true);
}

export async function arrangeClosedBrowserInfo(page: Page, world: LedgerWorld) {
  await openBrowserCategoryInfo(page, world, '個人', '餐飲');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '分類資訊', exact: true })).toBeHidden();
  const trigger = world.get<import('@playwright/test').Locator>('analysis:trigger');
  await expect(trigger).toBeFocused();
  expect(
    await trigger.evaluate((el) => {
      const style = getComputedStyle(el);

      return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    }),
  ).toBe(true);
}

export async function assertSelectedBrowserSnapshot(
  page: Page,
  world: LedgerWorld,
  currency: string,
) {
  const body = world.get<BrowserAnalysisReply>('analysis:uiReply');
  const {
    assertBrowserTotal,
    assertAnalysisDetails,
    assertAnalysisGeometry,
    displayOracle,
    percentOracle,
  } = await import('./assertions.js');
  const row = body.currencies.find((c) => c.currencyCode === currency)!;
  for (const [kind, key] of [
    ['個人', 'personal'],
    ['團體', 'group'],
  ] as const) {
    if (kind === '團體' && !body.hasSharedExpenses) continue;
    const chart = row[key];
    await assertBrowserTotal(page, world, kind, currency, displayOracle(chart.total));
    await assertAnalysisDetails(
      page,
      world,
      kind,
      currency,
      chart.categories.map((c) => ({
        分類: c.category?.name ?? '未分類',
        金額: displayOracle(c.amount),
        占比: percentOracle(c.amount, chart.total),
      })),
    );
  }
  await assertAnalysisGeometry(page, world);
}

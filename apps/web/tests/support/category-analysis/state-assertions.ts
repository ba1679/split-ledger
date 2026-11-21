import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { analysisSnapshot } from '../../../../api/tests/support/category-analysis/fixture.js';
import type { AnalysisReadControl } from './response.js';

export async function assertInitialAnalysisPending(page: Page, world: LedgerWorld) {
  const control = world.get<AnalysisReadControl>('analysis:control');
  expect(control.arrived).toBe(true);
  expect(control.finished).toBe(false);
  expect(control.status).toBe(200);
  await expect(page.getByRole('status', { name: '正在讀取花費分析', exact: true })).toBeVisible();
  await expect(page.locator('.analysis-total,.analysis-details,.recharts-sector')).toHaveCount(0);
  await expect(page.getByText(/尚無支出|還沒有.*支出|還沒有.*花費/)).toHaveCount(0);
  expect(await analysisSnapshot(world)).toEqual(world.get('analysis:actBefore'));
}

export async function assertInitialAnalysisFailure(page: Page, world: LedgerWorld) {
  const control = world.get<AnalysisReadControl>('analysis:control');
  await expect.poll(() => control.finished).toBe(true);
  expect(control.mode).toBe('失敗');
  expect(control.arrived).toBe(true);
  await expect(page.getByRole('alert').filter({ hasText: /無法|失敗/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /重新嘗試|重新更新|重新載入/ })).toBeEnabled();
  await expect(page.locator('.analysis-total,.analysis-details,.recharts-sector')).toHaveCount(0);
  await expect(page.getByText(/尚無支出|還沒有.*支出|還沒有.*花費/)).toHaveCount(0);
  expect(await analysisSnapshot(world)).toEqual(world.get('analysis:actBefore'));
}

export async function assertEmptyAnalysisSuccess(page: Page, world: LedgerWorld) {
  const { checkedBrowserReply } = await import('./assertions.js');
  const { analysisContext } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const b = await checkedBrowserReply(world);
  expect(b.currencies).toEqual([]);
  expect((await analysisSnapshot(world)).expenses).toEqual([]);
  await expect(page.getByText(/尚無支出|還沒有.*支出|還沒有.*花費/).first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: '統計幣別', exact: true })).toHaveCount(0);
  await expect(page.locator('.recharts-sector,.analysis-category-percent')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /返回.*帳本|旅行帳本/ })).toHaveAttribute(
    'href',
    `/trips/${analysisContext(world).tripId}`,
  );
}

export async function assertRetainedAnalysisUI(
  page: Page,
  world: LedgerWorld,
  currency?: string,
  personal?: string,
  groupCurrency?: string,
  group?: string,
) {
  const { analysisUISnapshot, checkBrowserAnalysisSource, analysisCard } =
    await import('./page.js');
  const { displayOracle, groupedDisplay } = await import('./assertions.js');
  const old = world.get<import('./page.js').BrowserAnalysisReply>('analysis:confirmedReply');
  checkBrowserAnalysisSource(world, old, world.get('analysis:confirmedSource'));
  expect(await analysisUISnapshot(page)).toEqual(world.get('analysis:confirmedUI'));
  if (currency) {
    expect(groupCurrency).toBe(currency);
    const row = old.currencies.find((c) => c.currencyCode === currency)!;
    expect(displayOracle(row.personal.total)).toBe(personal);
    expect(displayOracle(row.group.total)).toBe(group);
    await expect(analysisCard(page, '個人').getByLabel('個人總額', { exact: true })).toHaveText(
      groupedDisplay(personal!),
    );
    await expect(analysisCard(page, '團體').getByLabel('團體總額', { exact: true })).toHaveText(
      groupedDisplay(group!),
    );
  }
}

export async function assertAnalysisUpdating(
  page: Page,
  world: LedgerWorld,
  currency: string,
  personal: string,
  groupCurrency: string,
  group: string,
) {
  await assertRetainedAnalysisUI(page, world, currency, personal, groupCurrency, group);
  const control = world.get<AnalysisReadControl>('analysis:control');
  expect(control.arrived).toBe(true);
  expect(control.finished).toBe(false);
  expect(control.status).toBe(200);
  const { checkBrowserAnalysisSource } = await import('./page.js');
  const source = await analysisSnapshot(world);
  checkBrowserAnalysisSource(
    world,
    control.body as import('./page.js').BrowserAnalysisReply,
    source,
  );
  expect(source.expenses).not.toEqual(
    world.get<import('../../../../api/tests/support/category-analysis/oracle.js').Source>(
      'analysis:confirmedSource',
    ).expenses,
  );
  await expect(page.getByRole('status', { name: '正在更新花費分析', exact: true })).toBeVisible();
  await expect(page.locator('main').getByText(/載入中|更新中|\bloading\b/i)).toHaveCount(0);
}

export async function assertAnalysisUpdateFailure(
  page: Page,
  world: LedgerWorld,
  currency: string,
  personal: string,
  groupCurrency: string,
  group: string,
) {
  const control = world.get<AnalysisReadControl>('analysis:control');
  await expect.poll(() => control.finished).toBe(true);
  expect(control.mode).toBe('失敗');
  await assertRetainedAnalysisUI(page, world, currency, personal, groupCurrency, group);
  await expect(page.getByRole('status', { name: '正在更新花費分析', exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert').filter({ hasText: /上次.*資料|上次.*內容/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /重新嘗試|重新更新|重新載入/ })).toBeEnabled();
  const { checkBrowserAnalysisSource } = await import('./page.js');
  checkBrowserAnalysisSource(
    world,
    control.body as import('./page.js').BrowserAnalysisReply,
    await analysisSnapshot(world),
  );
}

export async function assertAnalysisOffline(page: Page, world: LedgerWorld) {
  await assertRetainedAnalysisUI(page, world);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  await expect(page.getByText(/等待網路連線|已離線，恢復連線後再更新/)).toBeVisible();
  await expect(page.locator('.analysis-page[data-fetch-status="paused"]')).toBeVisible();
  expect(
    await page
      .locator('.analysis-page')
      .evaluate((el) =>
        el
          .getAnimations({ subtree: true })
          .every(
            (a) =>
              a.playState !== 'running' || a.effect?.getComputedTiming().iterations !== Infinity,
          ),
      ),
  ).toBe(true);
  expect(await analysisSnapshot(world)).toEqual(world.get('analysis:actBefore'));
}

export async function assertTainanAnalysisPending(page: Page, world: LedgerWorld) {
  const tainan = world.get<AnalysisReadControl>('analysis:tainanControl'),
    japan = world.get<AnalysisReadControl>('analysis:japanControl');
  expect(tainan.arrived).toBe(true);
  expect(tainan.finished).toBe(false);
  expect(japan.finished).toBe(false);
  expect(tainan.path).not.toBe(japan.path);
  const { analysisContext } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const { checkBrowserAnalysisSource } = await import('./page.js');
  await expect(page).toHaveURL(new RegExp(`/trips/${analysisContext(world).tripId}/analysis$`));
  await expect(page.getByRole('link', { name: /台南旅行帳本|返回.*帳本/ })).toBeVisible();
  await expect(page.getByRole('status', { name: '正在讀取花費分析', exact: true })).toBeVisible();
  await expect(page.locator('.analysis-details,.analysis-total,.recharts-sector')).toHaveCount(0);
  await expect(page.getByText('餐飲', { exact: true })).toHaveCount(0);
  checkBrowserAnalysisSource(
    world,
    tainan.body as import('./page.js').BrowserAnalysisReply,
    await analysisSnapshot(world),
  );
  expect((japan.body as { tripId: string }).tripId).toBe(
    world.get<
      import('../../../../api/tests/support/category-analysis/context.js').CategoryAnalysisContext
    >('analysis:japanContext').tripId,
  );
}

export async function assertAnalysisAccessBoundary(page: Page, world: LedgerWorld, state: string) {
  expect(['未登入', '不可存取', '垃圾桶']).toContain(state);
  if (state === '未登入') {
    await expect(
      page.getByRole('button', { name: '使用 Google 帳號登入', exact: true }),
    ).toBeVisible();
  } else if (state === '垃圾桶') {
    await expect(page.getByRole('heading', { name: '旅行已在垃圾桶', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '前往垃圾桶復原', exact: true })).toHaveAttribute(
      'href',
      '/trips/trash',
    );
  } else {
    await expect(
      page
        .getByRole('heading')
        .filter({ hasText: /找不到|無法取得/ })
        .first(),
    ).toBeVisible();
    expect(await page.locator('a[href="/trips"]:visible').count()).toBeGreaterThan(0);
  }
  await expect(
    page.locator(
      '.analysis-total,.analysis-details,.recharts-sector,.ds-chart-tooltip,[role="dialog"][aria-label="分類資訊"]',
    ),
  ).toHaveCount(0);
  await expect(page.getByText('餐飲', { exact: true })).toHaveCount(0);
  const tree = await page.locator('main').ariaSnapshot();
  expect(tree).not.toContain('個人總額');
  expect(tree).not.toContain('團體總額');
  const source = await analysisSnapshot(world);
  expect(source).toEqual(world.get('analysis:actBefore'));
  if (state === '垃圾桶') expect(source.trips![0]!.deleted_at).not.toBeNull();
  else if (state === '不可存取')
    expect(source.trips!.length === 0 || world.get('analysis:viewer') !== 'Alice').toBe(true);
  const responses = world
    .get<{ path: string; status: number; body: unknown }[]>('analysis:accessResponses')
    .filter((r) => r.path.endsWith('/expense-analysis'));
  for (const r of responses) {
    expect(r.status).toBe(state === '未登入' ? 401 : state === '垃圾桶' ? 409 : 404);
    expect(r.body).toMatchObject({
      code:
        state === '未登入' ? 'UNAUTHENTICATED' : state === '垃圾桶' ? 'TRIP_TRASHED' : 'NOT_FOUND',
    });
    expect(Object.keys(r.body as object).sort()).toEqual(['code', 'message']);
  }
}

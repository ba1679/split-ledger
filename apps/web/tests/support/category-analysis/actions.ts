import { expect, type Page, type Locator } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { analysisSnapshot } from '../../../../api/tests/support/category-analysis/fixture.js';
import { openConfirmedBrowserAnalysis } from './page.js';
import type { AnalysisReadControl } from './response.js';

async function sectorInteriorPoint(sector: Locator) {
  await expect(sector).toBeVisible();

  return sector.evaluate((el) => {
    const path = el as SVGGeometryElement,
      box = path.getBBox(),
      matrix = path.getScreenCTM()!;
    for (let i = 1; i < 20; i++)
      for (let j = 1; j < 20; j++) {
        const p = new DOMPoint(box.x + (box.width * i) / 20, box.y + (box.height * j) / 20);
        if (
          path.isPointInFill(p) &&
          [
            [-2, 0],
            [2, 0],
            [0, -2],
            [0, 2],
          ].every(([x, y]) => path.isPointInFill(new DOMPoint(p.x + x!, p.y + y!)))
        ) {
          const screen = p.matrixTransform(matrix);
          if (
            screen.x >= 4 &&
            screen.x < innerWidth - 4 &&
            screen.y >= 4 &&
            screen.y < innerHeight - 4
          )
            return { x: screen.x, y: screen.y };
        }
      }
    throw Error('Rendered sector has no visible hittable interior');
  });
}

export async function openBrowserAnalysisFromLedger(page: Page, world: LedgerWorld) {
  const link = page.getByRole('link', { name: '花費分析', exact: true });
  await expect(link, 'Product ledger must expose the approved analysis entry').toBeVisible();
  const mobile = page.getByRole('navigation', { name: '行動導覽', exact: true });
  world.set('analysis:ledgerGeometry', {
    entry: await link.boundingBox(),
    navigation: await page
      .getByRole('navigation', { name: '旅行內導覽', exact: true })
      .boundingBox(),
    bottomCount: (await mobile.isVisible())
      ? await mobile.locator('a:visible,button:visible').count()
      : null,
  });
  const screenshot = `.cache/007-implement/ledger-${world.namespace}.png`;
  await page.screenshot({ path: screenshot, fullPage: true });
  world.set('analysis:ledgerScreenshot', screenshot);
  world.set('analysis:actBefore', await analysisSnapshot(world));
  const control = world.state.has('analysis:control')
    ? world.get<AnalysisReadControl>('analysis:control')
    : undefined;
  if (control && control.mode !== '成功') {
    await link.click();
    await expect.poll(() => control.arrived).toBe(true);
    if (control.mode === '失敗') await expect.poll(() => control.finished).toBe(true);
  } else await openConfirmedBrowserAnalysis(page, world);
  world.set('analysis:actAfter', await analysisSnapshot(world));
  expect(world.get('analysis:actAfter')).toEqual(world.get('analysis:actBefore'));
}

export async function keyboardAnalysisCurrency(page: Page, world: LedgerWorld, currency: string) {
  const reads = world.get<string[]>('analysis:requests').length;
  const { analysisCurrency, analysisUISnapshot, assertSelectedBrowserSnapshot } =
    await import('./page.js');
  const combo = analysisCurrency(page);
  let tabs = 0;
  while (!(await combo.evaluate((el) => el === document.activeElement)) && tabs < 80) {
    await page.keyboard.press('Tab');
    tabs++;
  }
  await expect(
    combo,
    'Currency control must remain keyboard reachable after information closes',
  ).toBeFocused();
  const codes = await combo
    .locator('option')
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLOptionElement).value));
  const index = codes.indexOf(currency);
  expect(index).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Home');
  for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(combo).toHaveValue(currency);
  world.set('analysis:selectedCurrency', currency);
  await assertSelectedBrowserSnapshot(page, world, currency);
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
  expect(world.get<string[]>('analysis:requests').length).toBe(reads);
  world.set('analysis:selectedUI', await analysisUISnapshot(page));
  world.set('analysis:keyboardTabs', tabs);
  expect(await analysisSnapshot(world)).toEqual(world.get('analysis:uiSource'));
}

export async function inspectBrowserCategory(
  page: Page,
  world: LedgerWorld,
  operation: string,
  kind: string,
  category: string,
  variant = 'default',
) {
  const { analysisCard, categoryControl, openBrowserCategoryInfo, analysisCurrency } =
    await import('./page.js');
  const before = await analysisSnapshot(world),
    body = world.get<import('./page.js').BrowserAnalysisReply>('analysis:uiReply'),
    currency = await analysisCurrency(page).inputValue();
  const row = body.currencies
    .find((c) => c.currencyCode === currency)!
    [kind === '個人' ? 'personal' : 'group'].categories.find(
      (c) => (c.category?.name ?? '未分類') === category,
    )!;
  expect(row).toBeTruthy();
  const sector = analysisCard(page, kind).locator(
    `.recharts-sector[data-category-id="${row.category?.id ?? 'unclassified'}"]`,
  );
  if (operation === '鍵盤選取')
    await openBrowserCategoryInfo(
      page,
      world,
      kind,
      category,
      variant === 'space' ? 'Space' : 'Enter',
    );
  else if (operation === '點按') {
    const target = variant === 'sector' ? sector : categoryControl(page, kind, category);
    if (variant === 'sector') {
      await target.scrollIntoViewIfNeeded();
      const point = await sectorInteriorPoint(target),
        box = await target.boundingBox();
      expect(box).not.toBeNull();
      await target.tap({ position: { x: point.x - box!.x, y: point.y - box!.y } });
    } else await target.tap();
    await expect(page.getByRole('dialog', { name: '分類資訊', exact: true })).toBeVisible();
    world.set('analysis:trigger', target);
  } else {
    expect(operation).toBe('滑鼠移入');
    await expect(sector).toBeVisible();
    const point = await sectorInteriorPoint(sector);
    await page.mouse.move(point.x, point.y);
    await expect(analysisCard(page, kind).locator('.ds-chart-tooltip')).toBeVisible();
    world.set('analysis:hoverPoint', point);
  }
  world.set('analysis:triggerKind', kind);
  world.set('analysis:triggerCategory', category);
  world.set('analysis:interaction', operation);
  world.set('analysis:triggerAmount', row.amount);
  expect(await analysisSnapshot(world)).toEqual(before);
}

export async function closeBrowserCategoryInfo(page: Page, world: LedgerWorld, operation: string) {
  const before = await analysisSnapshot(world),
    url = page.url();
  expect(['Escape', '關閉按鈕']).toContain(operation);
  if (operation === 'Escape') await page.keyboard.press('Escape');
  else
    await page
      .getByRole('dialog', { name: '分類資訊', exact: true })
      .getByRole('button', { name: '關閉分類資訊', exact: true })
      .click();
  await expect(page.getByRole('dialog', { name: '分類資訊', exact: true })).toBeHidden();
  expect(page.url()).toBe(url);
  expect(await analysisSnapshot(world)).toEqual(before);
}

export async function retryBrowserAnalysis(page: Page, world: LedgerWorld) {
  const { analysisContext } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const { checkBrowserAnalysisSource } = await import('./page.js');
  const before = await analysisSnapshot(world),
    path = `/api/trips/${analysisContext(world).tripId}/expense-analysis`;
  const button = page.getByRole('button', { name: /重新嘗試|重新更新|重新載入/ });
  await expect(button).toBeEnabled();
  const control = world.state.has('analysis:control')
    ? world.get<AnalysisReadControl>('analysis:control')
    : undefined;
  if (control && control.mode !== '成功') {
    await button.click();
    await expect.poll(() => control.arrived).toBe(true);
  } else {
    const pending = page.waitForResponse((r) => new URL(r.url()).pathname === path);
    await button.click();
    const response = await pending;
    expect(response.status()).toBe(200);
    const body = await response.json();
    checkBrowserAnalysisSource(world, body, before);
    world.set('analysis:uiReply', body);
    world.set('analysis:uiSource', before);
  }
  expect(await analysisSnapshot(world)).toEqual(before);
  world.set('analysis:actBefore', before);
  world.set('analysis:actAfter', await analysisSnapshot(world));
}

export async function refocusAnalysisRead(page: Page, world: LedgerWorld) {
  const { refocusBrowserAnalysis } = await import('./states.js');
  const before = await analysisSnapshot(world);
  world.set('analysis:actBefore', before);
  await refocusBrowserAnalysis(page);
  if (world.state.has('analysis:control'))
    await expect.poll(() => world.get<AnalysisReadControl>('analysis:control').arrived).toBe(true);
  else if (world.state.has('analysis:offline'))
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  world.set('analysis:actAfter', await analysisSnapshot(world));
  expect(world.get('analysis:actAfter')).toEqual(before);
}

export async function switchPendingTainanAnalysis(page: Page, world: LedgerWorld) {
  const { navigateTainanLedger } = await import('./races.js');
  await navigateTainanLedger(page, world);
  const control = world.get<AnalysisReadControl>('analysis:tainanControl');
  const link = page.getByRole('link', { name: '花費分析', exact: true });
  await expect(link).toBeVisible();
  await link.click();
  await expect.poll(() => control.arrived).toBe(true);
  expect(control.finished).toBe(false);
  expect(world.get<AnalysisReadControl>('analysis:japanControl').finished).toBe(false);
  world.set('analysis:actBefore', world.get('analysis:tainanSource'));
  world.set('analysis:actAfter', await analysisSnapshot(world));
  expect(world.get('analysis:actAfter')).toEqual(world.get('analysis:actBefore'));
}

export async function finishLateJapanAnalysis(page: Page, world: LedgerWorld) {
  const control = world.get<AnalysisReadControl>('analysis:japanControl'),
    before = await analysisSnapshot(world),
    url = page.url();
  expect(control.arrived).toBe(true);
  expect(control.finished).toBe(false);
  control.release();
  await expect.poll(() => control.finished).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(page.url()).toBe(url);
  expect(await analysisSnapshot(world)).toEqual(before);
  world.set('analysis:lateJapanFinished', true);
}

export async function openOriginalAnalysisLink(page: Page, world: LedgerWorld) {
  const { analysisContext } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const before = await analysisSnapshot(world),
    path = `/trips/${analysisContext(world).tripId}/analysis`;
  const responses: { path: string; status: number; body: unknown }[] = [];
  const observe = async (response: import('@playwright/test').Response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/api/'))
      responses.push({
        path: url.pathname,
        status: response.status(),
        body: await response.json().catch(() => undefined),
      });
  };
  page.on('response', observe);
  world.tripManagement.cleanups.add(async () => {
    page.off('response', observe);
  });
  world.set('analysis:accessResponses', responses);
  // Native same-origin history navigation keeps the existing QueryClient and old cached DOM alive.
  await page.evaluate((path) => {
    const state = {
      ...history.state,
      key: crypto.randomUUID(),
      idx: (history.state?.idx ?? 0) + 1,
    };
    history.pushState(state, '', path);
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  }, path);
  world.set('analysis:actBefore', before);
  world.set('analysis:actAfter', await analysisSnapshot(world));
}

export async function returnBrowserAnalysisLedger(page: Page, world: LedgerWorld) {
  const { analysisContext } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const before = await analysisSnapshot(world);
  await page.getByRole('link', { name: /返回.*帳本|旅行帳本/ }).click();
  await expect(page).toHaveURL(new RegExp(`/trips/${analysisContext(world).tripId}$`));
  await expect(
    page
      .locator('.ledger-record-count')
      .or(page.getByRole('heading', { name: '旅程還有很多空白，真好。', exact: true })),
  ).toBeVisible();
  world.set('analysis:actBefore', before);
  world.set('analysis:actAfter', await analysisSnapshot(world));
  expect(world.get('analysis:actAfter')).toEqual(before);
  const screenshot = `.cache/007-implement/returned-ledger-${world.namespace}.png`;
  await page.screenshot({ path: screenshot, fullPage: true });
  world.set('analysis:returnedLedgerScreenshot', screenshot);
}

export async function leaveBrowserAnalysisHover(page: Page, world: LedgerWorld) {
  const before = await analysisSnapshot(world);
  await page.mouse.move(1, 1);
  await expect(page.locator('.ds-chart-tooltip')).toBeHidden();
  world.set('analysis:pointerAfter', { x: 1, y: 1 });
  world.set('analysis:actBefore', before);
  world.set('analysis:actAfter', await analysisSnapshot(world));
  expect(world.get('analysis:actAfter')).toEqual(before);
}

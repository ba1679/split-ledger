import { expect } from '@playwright/test';
import { test } from '../../../../apps/web/tests/support/fixtures.js';
import { arrangeAnalysisRows } from '../../../../apps/web/tests/support/category-analysis/arrange.js';
import { openConfirmedBrowserAnalysis } from '../../../../apps/web/tests/support/category-analysis/page.js';
import { mkdir, writeFile } from 'node:fs/promises';

const prefix = process.env.ANALYSIS_CAPTURE_PREFIX ?? 'T118';
const rows = [
  {
    項目: '晚餐',
    分類: '餐飲',
    幣別: 'TWD',
    金額: '900',
    付款人: 'Amy',
    分攤者: 'Alice、Amy、Bob',
  },
  { 項目: '計程車', 分類: '交通', 幣別: 'TWD', 金額: '600', 付款人: 'Alice', 分攤者: 'Amy、Bob' },
  { 項目: '伴手禮', 分類: '購物', 幣別: 'TWD', 金額: '200', 付款人: 'Alice', 分攤者: 'Alice' },
  { 項目: '代買品', 分類: '購物', 幣別: 'TWD', 金額: '100', 付款人: 'Bob', 分攤者: 'Alice' },
  { 項目: '咖啡', 分類: '餐飲', 幣別: 'TWD', 金額: '100', 付款人: 'Bob', 分攤者: 'Bob' },
];
test('capture approved representative data with real API and independent oracle', async ({
  page,
  world,
  analysisViewport,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const root = 'specs/plans/007-category-expense-charts/checks/screens';
  await mkdir(root, { recursive: true });
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await page.screenshot({
    path: `${root}/${prefix}-${info.project.name}-ledger.png`,
    fullPage: true,
    scale: 'css',
  });
  await openConfirmedBrowserAnalysis(page, world);
  await page.screenshot({ path: `${root}/${prefix}-${info.project.name}-main.png`, scale: 'css' });
  const boxes = await page
    .locator(
      '.analysis-back,.analysis-heading,.analysis-currency-control,.analysis-cards,.analysis-card,.analysis-ring,.analysis-details,.analysis-hint',
    )
    .evaluateAll((nodes) =>
      nodes.map((el) => ({
        className: el.className,
        text: el.textContent,
        box: el.getBoundingClientRect().toJSON(),
      })),
    );
  await writeFile(
    `${root}/${prefix}-${info.project.name}-geometry.json`,
    JSON.stringify(boxes, null, 2),
  );
  if (analysisViewport === 'desktop') {
    await page.setViewportSize({ width: 900, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await expect
      .poll(() =>
        page
          .locator('.analysis-card')
          .evaluateAll(
            (cards) =>
              cards[1]!.getBoundingClientRect().top >= cards[0]!.getBoundingClientRect().bottom,
          ),
      )
      .toBe(true);
    await expect.poll(() => page.locator('.analysis-ring').evaluateAll((rings) => rings.every((ring) => {
      const pie = ring.querySelector('.recharts-pie')?.getBoundingClientRect();
      const total = ring.querySelector('.analysis-total')?.getBoundingClientRect();
      return !!pie && !!total && Math.abs(pie.x + pie.width / 2 - total.x - total.width / 2) <= 1 && Math.abs(pie.y + pie.height / 2 - total.y - total.height / 2) <= 1;
    }))).toBe(true);
    await page.screenshot({
      path: `${root}/${prefix}-${info.project.name}-intermediate.png`,
      scale: 'css',
    });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  expect(errors).toEqual([]);
  if (analysisViewport === 'mobile') {
    await page.evaluate(() => scrollTo(0, 480));
    await page.screenshot({
      path: `${root}/${prefix}-${info.project.name}-group.png`,
      scale: 'css',
    });
  }
});

test('capture selected-currency zero cards', async ({ page, world, analysisViewport }, info) => {
  await arrangeAnalysisRows(
    page,
    world,
    [
      rows[0]!,
      { 項目: '飲料', 分類: '餐飲', 幣別: 'USD', 金額: '10', 付款人: 'Bob', 分攤者: 'Bob' },
    ],
    analysisViewport,
  );
  await openConfirmedBrowserAnalysis(page, world);
  const { selectBrowserAnalysisCurrency } =
    await import('../../../../apps/web/tests/support/category-analysis/page.js');
  await selectBrowserAnalysisCurrency(page, world, 'USD');
  await page.screenshot({
    path: `specs/plans/007-category-expense-charts/checks/screens/${prefix}-${info.project.name}-zero.png`,
    fullPage: true,
    scale: 'css',
  });
});
test('capture no shared expenses explanation', async ({ page, world, analysisViewport }, info) => {
  await arrangeAnalysisRows(
    page,
    world,
    [{ 項目: '餐點', 分類: '餐飲', 幣別: 'TWD', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice' }],
    analysisViewport,
  );
  await openConfirmedBrowserAnalysis(page, world);
  await page.screenshot({
    path: `specs/plans/007-category-expense-charts/checks/screens/${prefix}-${info.project.name}-no-shared.png`,
    fullPage: true,
    scale: 'css',
  });
});

test('capture saved edit with real UI and refreshed exact charts', async ({
  page,
  world,
  analysisViewport,
}, info) => {
  const { confirmPreviousBrowserAnalysis } =
    await import('../../../../apps/web/tests/support/category-analysis/page.js');
  const { saveBrowserAnalysisAmount } =
    await import('../../../../apps/web/tests/support/category-analysis/mutations.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await confirmPreviousBrowserAnalysis(page, world);
  await saveBrowserAnalysisAmount(page, world, '晚餐', 'TWD', '1200');
  await openConfirmedBrowserAnalysis(page, world);
  await expect(page.getByLabel('個人總額', { exact: true })).toHaveText('700');
  await expect(page.getByLabel('團體總額', { exact: true })).toHaveText('1,800');
  const root = 'specs/plans/007-category-expense-charts/checks/screens';
  await page.screenshot({
    path: `${root}/${prefix}-${info.project.name}-saved-edit.png`,
    scale: 'css',
  });
  if (analysisViewport === 'mobile') {
    await page.evaluate(() => scrollTo(0, 480));
    await page.screenshot({
      path: `${root}/${prefix}-${info.project.name}-saved-edit-group.png`,
      scale: 'css',
    });
  }
});

test('capture category information and viewport edge behavior', async ({
  page,
  world,
  analysisViewport,
}, info) => {
  const { inspectBrowserCategory, closeBrowserCategoryInfo } =
    await import('../../../../apps/web/tests/support/category-analysis/actions.js');
  const { assertAnalysisInfo, assertAnalysisInfoClosed } =
    await import('../../../../apps/web/tests/support/category-analysis/assertions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openConfirmedBrowserAnalysis(page, world);
  const root = 'specs/plans/007-category-expense-charts/checks/screens';
  if (analysisViewport === 'desktop') {
    await inspectBrowserCategory(page, world, '滑鼠移入', '個人', '餐飲');
    await assertAnalysisInfo(page, world, '餐飲', 'TWD', '300', '50%');
    await page.screenshot({
      path: `${root}/${prefix}-${info.project.name}-hover.png`,
      scale: 'css',
    });
    await page.mouse.move(12, 12);
    await inspectBrowserCategory(page, world, '鍵盤選取', '個人', '餐飲');
    await assertAnalysisInfo(page, world, '餐飲', 'TWD', '300', '50%');
    await page.screenshot({
      path: `${root}/${prefix}-${info.project.name}-keyboard.png`,
      scale: 'css',
    });
    await closeBrowserCategoryInfo(page, world, 'Escape');
    await assertAnalysisInfoClosed(page, world);
    await page.setViewportSize({ width: 900, height: 900 });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await page
      .getByRole('region', { name: '團體花費', exact: true })
      .locator('.analysis-ring')
      .evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - (innerHeight - 70)));
    await inspectBrowserCategory(page, world, '滑鼠移入', '團體', '餐飲');
    await assertAnalysisInfo(page, world, '餐飲', 'TWD', '900', '60%');
    await page.screenshot({
      path: `${root}/${prefix}-${info.project.name}-hover-edge.png`,
      scale: 'css',
    });
  } else {
    await inspectBrowserCategory(page, world, '點按', '個人', '餐飲');
    await assertAnalysisInfo(page, world, '餐飲', 'TWD', '300', '50%');
    await page.screenshot({
      path: `${root}/${prefix}-${info.project.name}-touch.png`,
      scale: 'css',
    });
    await closeBrowserCategoryInfo(page, world, '關閉按鈕');
    await assertAnalysisInfoClosed(page, world);
    await page.evaluate(() => scrollTo(0, 480));
    await inspectBrowserCategory(page, world, '點按', '團體', '餐飲', 'sector');
    await assertAnalysisInfo(page, world, '餐飲', 'TWD', '900', '60%');
    await page.screenshot({
      path: `${root}/${prefix}-${info.project.name}-touch-group.png`,
      scale: 'css',
    });
    await closeBrowserCategoryInfo(page, world, '關閉按鈕');
    await assertAnalysisInfoClosed(page, world);
  }
});

for (const variant of ['small', 'long', 'fraction', 'large'] as const) {
  test(`capture ${variant} classification content`, async ({
    page,
    world,
    analysisViewport,
  }, info) => {
    const { arrangeLongAnalysisRows } =
      await import('../../../../apps/web/tests/support/category-analysis/arrange.js');
    const { assertLongAnalysisContent } =
      await import('../../../../apps/web/tests/support/category-analysis/assertions.js');
    if (variant === 'long') await arrangeLongAnalysisRows(page, world, analysisViewport);
    else {
      const sources =
        variant === 'small'
          ? [
              {
                項目: '小點',
                分類: '餐飲',
                幣別: 'TWD',
                金額: '0.01',
                付款人: 'Alice',
                分攤者: 'Alice',
              },
              {
                項目: '住宿',
                分類: '住宿',
                幣別: 'TWD',
                金額: '1000',
                付款人: 'Alice',
                分攤者: 'Alice',
              },
            ]
          : variant === 'fraction'
            ? [
                {
                  項目: '點心',
                  分類: '餐飲',
                  幣別: 'JPY',
                  金額: '100',
                  付款人: 'Alice',
                  分攤者: 'Alice、Amy、Bob',
                },
              ]
            : [
                {
                  項目: '市場探索',
                  分類: '餐飲與當地市場探索及特色小吃體驗的共同消費分類',
                  幣別: 'USD',
                  金額: '123456789012.34',
                  付款人: 'Alice',
                  分攤者: 'Alice',
                },
              ];
      await arrangeAnalysisRows(page, world, sources, analysisViewport);
    }
    await openConfirmedBrowserAnalysis(page, world);
    const root = 'specs/plans/007-category-expense-charts/checks/screens';
    if (variant === 'long') await assertLongAnalysisContent(page, world);
    await page.screenshot({
      path: `${root}/${prefix}-${info.project.name}-${variant}.png`,
      scale: 'css',
      fullPage: variant === 'long',
    });
    if (variant === 'fraction' || variant === 'small') {
      await page.locator('.analysis-rounding-note').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${root}/${prefix}-${info.project.name}-${variant}-note.png`,
        scale: 'css',
      });
    }
    if (variant === 'large') {
      const box = await page.locator('.analysis-total').boundingBox();
      expect(
        box!.height,
        'The exact total must fit inside the readable donut centre',
      ).toBeLessThanOrEqual(146);
    }
  });
}

for (const state of ['initial-pending', 'initial-failure', 'empty', 'background', 'background-failure', 'offline'] as const) {
  test(`capture analysis reading state ${state}`, async ({ page, world, analysisViewport }, info) => {
    const { controlNextAnalysis } = await import('../../../../apps/web/tests/support/category-analysis/response.js');
    const { analysisUISnapshot, checkBrowserAnalysisSource } = await import('../../../../apps/web/tests/support/category-analysis/page.js');
    const { analysisSnapshot } = await import('../../../../apps/api/tests/support/category-analysis/fixture.js');
    const { addAnalysisFromOtherDevice, refocusBrowserAnalysis, setBrowserAnalysisOffline } = await import('../../../../apps/web/tests/support/category-analysis/states.js');
    const initial = state.startsWith('initial');
    if (initial || state === 'empty') {
      const { seedEmptyAnalysis } = await import('../../../../apps/api/tests/support/category-analysis/fixture.js');
      const { openAnalysisLedger } = await import('../../../../apps/web/tests/support/category-analysis/arrange.js');
      await seedEmptyAnalysis(world);
      await openAnalysisLedger(page, world, analysisViewport);
    } else await arrangeAnalysisRows(page, world, rows, analysisViewport);
    if (initial) {
      const control = controlNextAnalysis(world, state === 'initial-pending' ? '延遲成功' : '失敗');
      await page.getByRole('link', { name: '花費分析', exact: true }).click();
      await expect.poll(() => control.arrived).toBe(true);
      if (state === 'initial-pending') {
        await expect(page.getByRole('status', { name: '正在讀取花費分析', exact: true })).toBeVisible();
        expect(control.finished).toBe(false);
      } else {
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(page.getByRole('button', { name: /重新/ })).toBeEnabled();
      }
      await expect(page.locator('.analysis-total,.analysis-details,.recharts-sector')).toHaveCount(0);
    } else {
      await openConfirmedBrowserAnalysis(page, world);
      const confirmed = await analysisUISnapshot(page);
      if (state === 'empty') await expect(page.getByText('還沒有花費可以分析', { exact: true })).toBeVisible();
      else if (state === 'offline') {
        await setBrowserAnalysisOffline(page, world);
        await refocusBrowserAnalysis(page);
        await expect(page.locator('.analysis-page[data-fetch-status="paused"]')).toBeVisible();
        await expect(page.getByRole('status').filter({ hasText: /已離線/ })).toBeVisible();
        expect(await analysisUISnapshot(page)).toEqual(confirmed);
      } else {
        await addAnalysisFromOtherDevice(page, world, 'TWD', '100');
        const control = controlNextAnalysis(world, state === 'background' ? '延遲成功' : '失敗');
        await refocusBrowserAnalysis(page);
        await expect.poll(() => control.arrived).toBe(true);
        if (state === 'background') await expect(page.getByRole('status', { name: '正在更新花費分析', exact: true })).toBeVisible();
        else await expect(page.getByRole('alert').filter({ hasText: /上次資料/ })).toBeVisible();
        checkBrowserAnalysisSource(world, control.body as import('../../../../apps/web/tests/support/category-analysis/page.js').BrowserAnalysisReply, await analysisSnapshot(world));
        expect(await analysisUISnapshot(page)).toEqual(confirmed);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `specs/plans/007-category-expense-charts/checks/screens/${prefix}-${info.project.name}-${state}.png`, scale: 'css' });
  });
}

for (const state of ['未登入', '同名其他帳號', '垃圾桶', '永久刪除', '已復原', '返回帳本']) {
  test(`capture analysis lifecycle state ${state}`, async ({ page, world, analysisViewport }, info) => {
    const { setAnalysisLifecycle, setAnalysisViewer } = await import('../../../../apps/api/tests/support/category-analysis/access.js');
    const { setBrowserAnalysisLifecycle } = await import('../../../../apps/web/tests/support/category-analysis/access.js');
    const { login } = await import('../../../../apps/web/tests/support/browser.js');
    const { openBrowserCategoryInfo } = await import('../../../../apps/web/tests/support/category-analysis/page.js');
    const { openOriginalAnalysisLink, returnBrowserAnalysisLedger } = await import('../../../../apps/web/tests/support/category-analysis/actions.js');
    const { assertAnalysisAccessBoundary } = await import('../../../../apps/web/tests/support/category-analysis/state-assertions.js');
    await arrangeAnalysisRows(page, world, rows, analysisViewport);
    await openConfirmedBrowserAnalysis(page, world);
    await openBrowserCategoryInfo(page, world, '個人', '餐飲');
    if (state === '返回帳本') {
      await returnBrowserAnalysisLedger(page, world);
      const { assertReturnedAnalysisLedger } = await import('../../../../apps/web/tests/support/category-analysis/assertions.js');
      await assertReturnedAnalysisLedger(page, world);
    } else if (state === '已復原') {
      await setBrowserAnalysisLifecycle(page, world, state);
      await openConfirmedBrowserAnalysis(page, world);
      await expect(page.getByLabel('個人總額', { exact: true })).toHaveText('600');
      await expect(page.getByRole('dialog', { name: '分類資訊', exact: true })).toHaveCount(0);
    } else {
      if (state === '未登入' || state === '同名其他帳號') {
        await setAnalysisViewer(world, state);
        if (state === '同名其他帳號') await login(page, world, 'Amy');
      } else await setAnalysisLifecycle(world, state);
      await openOriginalAnalysisLink(page, world);
      await assertAnalysisAccessBoundary(page, world, state === '同名其他帳號' || state === '永久刪除' ? '不可存取' : state);
      if (state === '同名其他帳號') await expect(page.getByText('Alice 的旅行帳本', { exact: true })).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `specs/plans/007-category-expense-charts/checks/screens/${prefix}-${info.project.name}-${state}.png`, scale: 'css', fullPage: state === '返回帳本' });
  });
}

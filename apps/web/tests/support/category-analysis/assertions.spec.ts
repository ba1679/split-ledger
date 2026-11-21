import { test } from '../fixtures.js';
import { arrangeAnalysisRows } from './arrange.js';
import { openBrowserAnalysisFromLedger } from './actions.js';
import { assertBrowserTotal } from './assertions.js';

const rows = [
  {
    項目: '晚餐',
    分類: '餐飲',
    幣別: 'TWD',
    金額: '900',
    付款人: 'Amy',
    分攤者: 'Alice、Amy、Bob',
  },
];
test('T080 center total is formatted from exact true DB/API scope', async ({
  page,
  world,
  analysisViewport,
}) => {
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await assertBrowserTotal(page, world, '個人', 'TWD', '300');
});
test('T081 entry result belongs to DB-owned trip and return link points to original ledger', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertAnalysisRoute } = await import('./assertions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await assertAnalysisRoute(page, world);
});
test.describe('T082 mobile', () => {
  test.use({ analysisViewport: 'mobile' });
  test('prior ledger has full-width analysis row and five bottom items', async ({
    page,
    world,
    analysisViewport,
  }) => {
    const { assertMobileAnalysisEntry } = await import('./assertions.js');
    await arrangeAnalysisRows(page, world, rows, analysisViewport);
    await openBrowserAnalysisFromLedger(page, world);
    await assertMobileAnalysisEntry(page, world);
  });
});
for (const viewport of ['desktop', 'mobile'] as const)
  test.describe(`T083 ${viewport}`, () => {
    test.use({ analysisViewport: viewport });
    test('chart layout follows independent viewport execution', async ({
      page,
      world,
      analysisViewport,
    }) => {
      const { assertAnalysisLayout } = await import('./assertions.js');
      await arrangeAnalysisRows(page, world, rows, analysisViewport);
      await openBrowserAnalysisFromLedger(page, world);
      await assertAnalysisLayout(page, world);
    });
  });
test('T084 complete persistent category ID/name/amount/percentage set matches independent oracle', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertAnalysisDetails } = await import('./assertions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await assertAnalysisDetails(page, world, '個人', 'TWD', [
    { 分類: '餐飲', 金額: '300', 占比: '100%' },
  ]);
});
test('T085 two chart totals retain independent denominators and same currency', async ({
  page,
  world,
  analysisViewport,
}) => {
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await assertBrowserTotal(page, world, '個人', 'TWD', '300');
  await assertBrowserTotal(page, world, '團體', 'TWD', '900');
});
test('T086 actual rendered outer SVG arc spans agree with exact fraction ratios', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertAnalysisGeometry } = await import('./assertions.js');
  await arrangeAnalysisRows(
    page,
    world,
    [...rows, { ...rows[0]!, 項目: '購物', 分類: '購物', 金額: '600' }],
    analysisViewport,
  );
  await openBrowserAnalysisFromLedger(page, world);
  await assertAnalysisGeometry(page, world);
});
test('T087 group scope explanation accompanies real multi-member consumption', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertSharedAnalysisExplanation } = await import('./assertions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await assertSharedAnalysisExplanation(page, world);
});
test('T088 selected code and complete ordered options match DB, including zero charts', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertSelectedAnalysisCurrency } = await import('./assertions.js');
  await arrangeAnalysisRows(
    page,
    world,
    [...rows, { ...rows[0]!, 項目: '他人美元', 幣別: 'USD', 金額: '10', 分攤者: 'Bob' }],
    analysisViewport,
  );
  await openBrowserAnalysisFromLedger(page, world);
  await assertSelectedAnalysisCurrency(page, world, 'TWD', 'TWD、USD');
});
test('T089 selected currency zero chart is not a fake consumption donut', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertZeroAnalysisChart } = await import('./assertions.js');
  const { selectBrowserAnalysisCurrency } = await import('./page.js');
  await arrangeAnalysisRows(
    page,
    world,
    [...rows, { ...rows[0]!, 項目: '他人美元', 幣別: 'USD', 金額: '10', 分攤者: 'Bob' }],
    analysisViewport,
  );
  await openBrowserAnalysisFromLedger(page, world);
  await selectBrowserAnalysisCurrency(page, world, 'USD');
  await assertZeroAnalysisChart(page, world, '個人', 'USD');
  await assertZeroAnalysisChart(page, world, '團體', 'USD');
});
test('T090 whole-trip no-shared state replaces group card while personal remains', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertNoSharedAnalysis } = await import('./assertions.js');
  await arrangeAnalysisRows(page, world, [{ ...rows[0]!, 分攤者: 'Alice' }], analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await assertNoSharedAnalysis(page, world);
});
test('T091 visible information has true chart-specific values and viewport bounds', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { openBrowserCategoryInfo } = await import('./page.js');
  const { assertAnalysisInfo } = await import('./assertions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await openBrowserCategoryInfo(page, world, '個人', '餐飲');
  await assertAnalysisInfo(page, world, '餐飲', 'TWD', '300', '100%');
});
test('T092 reduced-motion retains accessible complete permanent details', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertPersistentAnalysisDetails } = await import('./assertions.js');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await assertPersistentAnalysisDetails(page, world);
});
test('T093 same stable category uses the same actual SVG and detail color in both charts', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertAnalysisSameColor } = await import('./assertions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await assertAnalysisSameColor(page, world, '餐飲');
});
test('T094 close restores exact trigger focus with visible ring and unchanged scope', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { openBrowserCategoryInfo } = await import('./page.js');
  const { closeBrowserCategoryInfo } = await import('./actions.js');
  const { assertAnalysisInfoClosed } = await import('./assertions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await openBrowserCategoryInfo(page, world, '個人', '餐飲');
  await closeBrowserCategoryInfo(page, world, 'Escape');
  await assertAnalysisInfoClosed(page, world);
});
test('T095 unique positive category renders an actual full annulus, not a zero ring', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertFullAnalysisRing } = await import('./assertions.js');
  await arrangeAnalysisRows(page, world, [{ ...rows[0]!, 分攤者: 'Alice' }], analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await assertFullAnalysisRing(page, world, '個人');
});
test('T096 tiny positive category remains listed with exact value and bounded real geometry', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertSmallAnalysisCategory } = await import('./assertions.js');
  await arrangeAnalysisRows(
    page,
    world,
    [
      { ...rows[0]!, 幣別: 'USD', 金額: '0.01', 分攤者: 'Alice' },
      { ...rows[0]!, 項目: '大額', 分類: '購物', 幣別: 'USD', 金額: '1000', 分攤者: 'Alice' },
    ],
    analysisViewport,
  );
  await openBrowserAnalysisFromLedger(page, world);
  await assertSmallAnalysisCategory(page, world, '個人', '餐飲', '0.01', '小於0.01%');
});
test.describe('T097 mobile', () => {
  test.use({ analysisViewport: 'mobile' });
  test('all legal long category names and amounts wrap without clipping or merging', async ({
    page,
    world,
    analysisViewport,
  }) => {
    const { arrangeLongAnalysisRows } = await import('./arrange.js');
    const { assertLongAnalysisContent } = await import('./assertions.js');
    await arrangeLongAnalysisRows(page, world, analysisViewport);
    await openBrowserAnalysisFromLedger(page, world);
    await assertLongAnalysisContent(page, world);
  });
});
test('T106 returned ledger preserves totals/balance/list positions and exact existing API semantics', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { returnBrowserAnalysisLedger } = await import('./actions.js');
  const { assertReturnedAnalysisLedger } = await import('./assertions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await returnBrowserAnalysisLedger(page, world);
  await assertReturnedAnalysisLedger(page, world);
});
test('T109 tooltip disappears while full true persistent details remain', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { expect } = await import('@playwright/test');
  const { inspectBrowserCategory, leaveBrowserAnalysisHover } = await import('./actions.js');
  const { assertPersistentAnalysisDetails } = await import('./assertions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await inspectBrowserCategory(page, world, '滑鼠移入', '個人', '餐飲');
  await leaveBrowserAnalysisHover(page, world);
  await expect(page.getByRole('tooltip', { name: '分類資訊', exact: true })).toBeHidden();
  await assertPersistentAnalysisDetails(page, world);
});
test('T110 displayed thirds do not change exact raw shares', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertAnalysisExactShares } = await import('./assertions.js');
  await arrangeAnalysisRows(
    page,
    world,
    [{ ...rows[0]!, 幣別: 'JPY', 金額: '100' }],
    analysisViewport,
  );
  await openBrowserAnalysisFromLedger(page, world);
  await assertAnalysisExactShares(page, world);
});

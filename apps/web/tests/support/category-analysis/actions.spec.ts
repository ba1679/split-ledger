import { test } from '../fixtures.js';
import { arrangeAnalysisRows } from './arrange.js';
import { openBrowserAnalysisFromLedger } from './actions.js';

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
test('T069 single ledger entry Act captures prior layout and real request lifecycle', async ({
  page,
  world,
  analysisViewport,
}) => {
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
});
test('T070 currency Act changes both charts from the same true snapshot', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { openConfirmedBrowserAnalysis, selectBrowserAnalysisCurrency } = await import('./page.js');
  await arrangeAnalysisRows(
    page,
    world,
    [...rows, { ...rows[0]!, 項目: '日圓', 幣別: 'JPY', 金額: '300' }],
    analysisViewport,
  );
  await openConfirmedBrowserAnalysis(page, world);
  await selectBrowserAnalysisCurrency(page, world, 'TWD');
});
test('T071 native Tab/Home/Arrow/Enter selects currency from returned category focus', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { openConfirmedBrowserAnalysis, arrangeClosedBrowserInfo } = await import('./page.js');
  const { keyboardAnalysisCurrency } = await import('./actions.js');
  await arrangeAnalysisRows(
    page,
    world,
    [...rows, { ...rows[0]!, 項目: '日圓', 幣別: 'JPY', 金額: '300' }],
    analysisViewport,
  );
  await openConfirmedBrowserAnalysis(page, world);
  await arrangeClosedBrowserInfo(page, world);
  await keyboardAnalysisCurrency(page, world, 'TWD');
});
for (const operation of ['滑鼠移入', '鍵盤選取'])
  test(`T072 ${operation} targets actual chart or accessible row`, async ({
    page,
    world,
    analysisViewport,
  }) => {
    const { openConfirmedBrowserAnalysis } = await import('./page.js');
    const { inspectBrowserCategory } = await import('./actions.js');
    await arrangeAnalysisRows(page, world, rows, analysisViewport);
    await openConfirmedBrowserAnalysis(page, world);
    await inspectBrowserCategory(page, world, operation, '個人', '餐飲');
  });
for (const operation of ['Escape', '關閉按鈕'])
  test(`T073 ${operation} closes without navigation or writes`, async ({
    page,
    world,
    analysisViewport,
  }) => {
    const { openConfirmedBrowserAnalysis, openBrowserCategoryInfo } = await import('./page.js');
    const { closeBrowserCategoryInfo } = await import('./actions.js');
    await arrangeAnalysisRows(page, world, rows, analysisViewport);
    await openConfirmedBrowserAnalysis(page, world);
    await openBrowserCategoryInfo(page, world, '個人', '餐飲');
    await closeBrowserCategoryInfo(page, world, operation);
  });
test('T074 retry uses one real retry control and true response, without reload', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { seedEmptyAnalysis } =
    await import('../../../../api/tests/support/category-analysis/fixture.js');
  const { openAnalysisLedger } = await import('./arrange.js');
  const { arrangeAnalysisFailure } = await import('./states.js');
  const { controlNextAnalysis } = await import('./response.js');
  const { retryBrowserAnalysis } = await import('./actions.js');
  await seedEmptyAnalysis(world);
  await openAnalysisLedger(page, world, analysisViewport);
  await arrangeAnalysisFailure(page, world, '初讀失敗');
  controlNextAnalysis(world, '成功');
  await retryBrowserAnalysis(page, world);
});
test('T075 visibility refocus triggers genuine background read without navigation', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { arrangeConfirmedAnalysisMeal } = await import('./states.js');
  const { controlNextAnalysis } = await import('./response.js');
  const { refocusAnalysisRead } = await import('./actions.js');
  await arrangeConfirmedAnalysisMeal(page, world, 'TWD', '100', 'TWD', '200', analysisViewport);
  controlNextAnalysis(world, '延遲成功');
  await refocusAnalysisRead(page, world);
});
test('T076 native trip navigation leaves both real reads pending independently', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { seedDualAnalysisTrips, arrangePendingJapanAnalysis, arrangePendingTainanAnalysis } =
    await import('./races.js');
  const { switchPendingTainanAnalysis } = await import('./actions.js');
  await seedDualAnalysisTrips(world, 'JPY', '100', 'TWD', '200');
  await arrangePendingJapanAnalysis(page, world, analysisViewport);
  await arrangePendingTainanAnalysis(world);
  await switchPendingTainanAnalysis(page, world);
});
test('T077 only the external old response is released, without re-navigation', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { seedDualAnalysisTrips, arrangeTainanWithPendingJapan } = await import('./races.js');
  const { finishLateJapanAnalysis } = await import('./actions.js');
  await seedDualAnalysisTrips(world, 'JPY', '100', 'TWD', '200');
  await arrangeTainanWithPendingJapan(page, world, analysisViewport);
  await finishLateJapanAnalysis(page, world);
});
test('T078 native deep link keeps old SPA cache while authority guard resolves', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { arrangeConfirmedAnalysisMeal } = await import('./states.js');
  const { setAnalysisViewer } =
    await import('../../../../api/tests/support/category-analysis/access.js');
  const { openOriginalAnalysisLink } = await import('./actions.js');
  await arrangeConfirmedAnalysisMeal(page, world, 'TWD', '100', 'TWD', '200', analysisViewport);
  await setAnalysisViewer(world, '未登入');
  await openOriginalAnalysisLink(page, world);
});
test('T079 return link reaches same ledger with unchanged source', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { openConfirmedBrowserAnalysis } = await import('./page.js');
  const { returnBrowserAnalysisLedger } = await import('./actions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openConfirmedBrowserAnalysis(page, world);
  await returnBrowserAnalysisLedger(page, world);
});
test('T107 prior hover is genuinely shown before pointer-leave Act', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { openConfirmedBrowserAnalysis } = await import('./page.js');
  const { inspectBrowserCategory } = await import('./actions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openConfirmedBrowserAnalysis(page, world);
  await inspectBrowserCategory(page, world, '滑鼠移入', '個人', '餐飲');
});
test('T108 only moves pointer outside sector and information region', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { openConfirmedBrowserAnalysis } = await import('./page.js');
  const { inspectBrowserCategory, leaveBrowserAnalysisHover } = await import('./actions.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openConfirmedBrowserAnalysis(page, world);
  await inspectBrowserCategory(page, world, '滑鼠移入', '個人', '餐飲');
  await leaveBrowserAnalysisHover(page, world);
});

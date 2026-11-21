import { test, expect } from '../fixtures.js';
import { arrangeAnalysisRows } from './arrange.js';
import { confirmPreviousBrowserAnalysis } from './page.js';

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
test('T053 previous confirmed analysis captures real API/DB/UI and returns to ledger', async ({
  page,
  world,
  analysisViewport,
}) => {
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await confirmPreviousBrowserAnalysis(page, world);
  expect(world.state.has('analysis:confirmedUI')).toBe(true);
});
test('T054 real selected currency survives return to ledger', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { retainBrowserAnalysisCurrency } = await import('./page.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await retainBrowserAnalysisCurrency(page, world, 'TWD');
  expect(world.get('analysis:selectedCurrency')).toBe('TWD');
});
test('T055 selected page begins on real successful snapshot', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { openConfirmedBrowserAnalysis, selectBrowserAnalysisCurrency } = await import('./page.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openConfirmedBrowserAnalysis(page, world);
  await selectBrowserAnalysisCurrency(page, world, 'TWD');
  expect(world.get('analysis:selectedCurrency')).toBe('TWD');
});
test('T056 previous currency is arranged before current without mixing scope', async ({
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
  await selectBrowserAnalysisCurrency(page, world, 'JPY');
  world.set('analysis:previousCurrencyUI', world.get('analysis:selectedUI'));
  await selectBrowserAnalysisCurrency(page, world, 'TWD');
  expect(world.get('analysis:selectedCurrency')).toBe('TWD');
});
test('T057 keyboard arrangement opens real category information and remembers trigger', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { openConfirmedBrowserAnalysis, openBrowserCategoryInfo } = await import('./page.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openConfirmedBrowserAnalysis(page, world);
  await openBrowserCategoryInfo(page, world, '個人', '餐飲');
  expect(world.get('analysis:triggerCategory')).toBe('餐飲');
});
test('T058 closed information leaves visible keyboard focus on original control', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { openConfirmedBrowserAnalysis, arrangeClosedBrowserInfo } = await import('./page.js');
  await arrangeAnalysisRows(page, world, rows, analysisViewport);
  await openConfirmedBrowserAnalysis(page, world);
  await arrangeClosedBrowserInfo(page, world);
});

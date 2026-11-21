import { test, expect } from '../fixtures.js';
import { arrangeConfirmedAnalysisMeal } from './states.js';

test('T061 confirmed content retains real source and complete UI geometry', async ({
  page,
  world,
  analysisViewport,
}) => {
  await arrangeConfirmedAnalysisMeal(page, world, 'TWD', '100', 'TWD', '200', analysisViewport);
  expect(world.state.has('analysis:confirmedUI')).toBe(true);
});
test('T062 independent device commits real source without patching original UI', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { addAnalysisFromOtherDevice } = await import('./states.js');
  await arrangeConfirmedAnalysisMeal(page, world, 'TWD', '100', 'TWD', '200', analysisViewport);
  await addAnalysisFromOtherDevice(page, world, 'TWD', '100');
});
for (const state of ['初讀失敗', '背景失敗'])
  test(`T063 ${state} arranges genuine transport failure before retry`, async ({
    page,
    world,
    analysisViewport,
  }) => {
    const { arrangeAnalysisFailure } = await import('./states.js');
    if (state === '背景失敗')
      await arrangeConfirmedAnalysisMeal(page, world, 'TWD', '100', 'TWD', '200', analysisViewport);
    else {
      const { seedEmptyAnalysis } =
        await import('../../../../api/tests/support/category-analysis/fixture.js');
      const { openAnalysisLedger } = await import('./arrange.js');
      await seedEmptyAnalysis(world);
      await openAnalysisLedger(page, world, analysisViewport);
    }
    await arrangeAnalysisFailure(page, world, state);
  });
test('T064 native browser offline leaves independent DB available and cleans up context', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { arrangeAnalysisRows } = await import('./arrange.js');
  const { setBrowserAnalysisOffline } = await import('./states.js');
  await arrangeAnalysisRows(
    page,
    world,
    [
      {
        項目: '餐點',
        分類: '餐飲',
        幣別: 'TWD',
        金額: '200',
        付款人: 'Alice',
        分攤者: 'Alice、Amy',
      },
    ],
    analysisViewport,
  );
  await setBrowserAnalysisOffline(page, world);
  expect(world.get('analysis:offline')).toBe(true);
});
test('T111 F55 restoration returns from cached analysis to original ledger before Act', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { setBrowserAnalysisLifecycle } = await import('./access.js');
  await arrangeConfirmedAnalysisMeal(page, world, 'TWD', '100', 'TWD', '200', analysisViewport);
  await setBrowserAnalysisLifecycle(page, world, '已復原');
  await expect(page).toHaveURL(/\/trips\/[^/]+$/);
});

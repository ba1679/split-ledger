import { test } from '../fixtures.js';
import { seedEmptyAnalysis } from '../../../../api/tests/support/category-analysis/fixture.js';
import { openAnalysisLedger } from './arrange.js';
import { controlNextAnalysis } from './response.js';
import { openBrowserAnalysisFromLedger } from './actions.js';
import { assertInitialAnalysisPending } from './state-assertions.js';

test('T098 genuine initial pending never renders confirmed zero', async ({
  page,
  world,
  analysisViewport,
}) => {
  await seedEmptyAnalysis(world);
  await openAnalysisLedger(page, world, analysisViewport);
  controlNextAnalysis(world, '延遲成功');
  await openBrowserAnalysisFromLedger(page, world);
  await assertInitialAnalysisPending(page, world);
});
test('T099 genuine initial failure offers retry and never pretends empty success', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertInitialAnalysisFailure } = await import('./state-assertions.js');
  await seedEmptyAnalysis(world);
  await openAnalysisLedger(page, world, analysisViewport);
  controlNextAnalysis(world, '失敗');
  await openBrowserAnalysisFromLedger(page, world);
  await assertInitialAnalysisFailure(page, world);
});
test('T100 true successful empty source hides currency and consumption geometry', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { assertEmptyAnalysisSuccess } = await import('./state-assertions.js');
  await seedEmptyAnalysis(world);
  await openAnalysisLedger(page, world, analysisViewport);
  await openBrowserAnalysisFromLedger(page, world);
  await assertEmptyAnalysisSuccess(page, world);
});
test('T101 background pending preserves complete old geometry/details and labels busy accessibly', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { arrangeConfirmedAnalysisMeal, addAnalysisFromOtherDevice } = await import('./states.js');
  const { refocusAnalysisRead } = await import('./actions.js');
  const { assertAnalysisUpdating } = await import('./state-assertions.js');
  await arrangeConfirmedAnalysisMeal(page, world, 'TWD', '100', 'TWD', '200', analysisViewport);
  await addAnalysisFromOtherDevice(page, world, 'TWD', '100');
  controlNextAnalysis(world, '延遲成功');
  await refocusAnalysisRead(page, world);
  await assertAnalysisUpdating(page, world, 'TWD', '100', 'TWD', '200');
});
test('T102 background failure preserves old complete charts and offers retry as previous data', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { arrangeConfirmedAnalysisMeal, addAnalysisFromOtherDevice } = await import('./states.js');
  const { refocusAnalysisRead } = await import('./actions.js');
  const { assertAnalysisUpdateFailure } = await import('./state-assertions.js');
  await arrangeConfirmedAnalysisMeal(page, world, 'TWD', '100', 'TWD', '200', analysisViewport);
  await addAnalysisFromOtherDevice(page, world, 'TWD', '100');
  controlNextAnalysis(world, '失敗');
  await refocusAnalysisRead(page, world);
  await assertAnalysisUpdateFailure(page, world, 'TWD', '100', 'TWD', '200');
});
test('T103 native offline pauses query and infinite animation while retaining old content', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { arrangeConfirmedAnalysisMeal, setBrowserAnalysisOffline } = await import('./states.js');
  const { refocusAnalysisRead } = await import('./actions.js');
  const { assertAnalysisOffline } = await import('./state-assertions.js');
  await arrangeConfirmedAnalysisMeal(page, world, 'TWD', '100', 'TWD', '200', analysisViewport);
  await setBrowserAnalysisOffline(page, world);
  await refocusAnalysisRead(page, world);
  await assertAnalysisOffline(page, world);
});
test('T104 pending Tainan cannot display old Japan category or amount', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { seedDualAnalysisTrips, arrangePendingJapanAnalysis, arrangePendingTainanAnalysis } =
    await import('./races.js');
  const { switchPendingTainanAnalysis } = await import('./actions.js');
  const { assertTainanAnalysisPending } = await import('./state-assertions.js');
  await seedDualAnalysisTrips(world, 'JPY', '100', 'TWD', '200');
  await arrangePendingJapanAnalysis(page, world, analysisViewport);
  await arrangePendingTainanAnalysis(world);
  await switchPendingTainanAnalysis(page, world);
  await assertTainanAnalysisPending(page, world);
});
test('T105 logout cannot expose prior cached chart/category/amount through DOM or accessibility', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { arrangeConfirmedAnalysisMeal } = await import('./states.js');
  const { setAnalysisViewer } =
    await import('../../../../api/tests/support/category-analysis/access.js');
  const { openOriginalAnalysisLink } = await import('./actions.js');
  const { assertAnalysisAccessBoundary } = await import('./state-assertions.js');
  await arrangeConfirmedAnalysisMeal(page, world, 'TWD', '100', 'TWD', '200', analysisViewport);
  await setAnalysisViewer(world, '未登入');
  await openOriginalAnalysisLink(page, world);
  await assertAnalysisAccessBoundary(page, world, '未登入');
});

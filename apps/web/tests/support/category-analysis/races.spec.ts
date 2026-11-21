import { test, expect } from '../fixtures.js';
import { seedDualAnalysisTrips } from './races.js';
import type { Source } from '../../../../api/tests/support/category-analysis/oracle.js';

test('T065 dual trips retain distinct IDs/categories/exact source without page read', async ({
  world,
}) => {
  await seedDualAnalysisTrips(world, 'JPY', '100', 'TWD', '200');
  const japan = world.get<Source>('analysis:japanSource'),
    tainan = world.get<Source>('analysis:tainanSource');
  expect(japan.expenses![0]).toMatchObject({ currency_code: 'JPY', amount_minor: '100' });
  expect(tainan.expenses![0]).toMatchObject({ currency_code: 'TWD', amount_minor: '20000' });
  expect(japan.expenses![0]!.trip_id).not.toBe(tainan.expenses![0]!.trip_id);
});
test('T066 native Japan read remains held with real authenticated bytes', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { arrangePendingJapanAnalysis } = await import('./races.js');
  await seedDualAnalysisTrips(world, 'JPY', '100', 'TWD', '200');
  await arrangePendingJapanAnalysis(page, world, analysisViewport);
});
test('T067 second scoped barrier does not issue Tainan request early', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { arrangePendingJapanAnalysis, arrangePendingTainanAnalysis } = await import('./races.js');
  await seedDualAnalysisTrips(world, 'JPY', '100', 'TWD', '200');
  await arrangePendingJapanAnalysis(page, world, analysisViewport);
  const c = await arrangePendingTainanAnalysis(world);
  expect(c.arrived).toBe(false);
});
test('T068 successful Tainan scope coexists with held old Japan response', async ({
  page,
  world,
  analysisViewport,
}) => {
  const { arrangeTainanWithPendingJapan } = await import('./races.js');
  await seedDualAnalysisTrips(world, 'JPY', '100', 'TWD', '200');
  await arrangeTainanWithPendingJapan(page, world, analysisViewport);
});

import { test, expect } from '../fixtures.js';
import { seedAnalysisRows, analysisContext, analysisSnapshot } from './fixture.js';

test('T008 complete category source fixture persists payer, category, exact amount and shares', async ({
  world,
}) => {
  await seedAnalysisRows(world, [
    {
      項目: '晚餐',
      分類: '餐飲',
      幣別: 'TWD',
      金額: '900',
      付款人: 'Amy',
      分攤者: 'Alice、Amy、Bob',
    },
    { 項目: '無分類', 分類: '未分類', 幣別: 'JPY', 金額: '100', 付款人: 'Bob', 分攤者: 'Alice' },
  ]);
  const c = analysisContext(world),
    s = await analysisSnapshot(world);
  expect(s.expenses).toHaveLength(2);
  expect(s.shares).toHaveLength(4);
  expect(s.categories).toHaveLength(1);
  expect(s.expenses!.find((e) => e.item === '晚餐')).toMatchObject({
    amount_minor: '90000',
    minor_unit: 2,
    category_id: c.categories.get('餐飲'),
  });
  expect(s.expenses!.find((e) => e.item === '無分類')).toMatchObject({
    amount_minor: '100',
    minor_unit: 0,
    category_id: null,
  });
  expect(world.get('analysis:source')).toEqual(s);
});
test('T009 appending uses real save and preserves prior source', async ({ world }) => {
  const { appendAnalysisRows } = await import('./fixture.js');
  await seedAnalysisRows(world, [
    { 項目: '舊', 分類: '餐飲', 幣別: 'JPY', 金額: '100', 付款人: 'Amy', 分攤者: 'Alice、Amy' },
  ]);
  await appendAnalysisRows(world, [
    { 項目: '新', 分類: '餐飲', 幣別: 'JPY', 金額: '300', 付款人: 'Bob', 分攤者: 'Alice、Bob' },
  ]);
  const s = await analysisSnapshot(world);
  expect(s.expenses).toHaveLength(2);
  expect(s.shares).toHaveLength(4);
  expect(s.expenses!.find((e) => e.item === '新')).toMatchObject({ amount_minor: '300' });
});
test('T010 empty trip has fixed owner, companions and no expense', async ({ world }) => {
  const { seedEmptyAnalysis } = await import('./fixture.js');
  await seedEmptyAnalysis(world);
  const s = await analysisSnapshot(world);
  expect(s.expenses).toEqual([]);
  expect(s.members).toHaveLength(3);
  expect(s.trips).toHaveLength(1);
  expect(s.members!.filter((m) => m.role === 'owner').map((m) => m.id)).toEqual([
    analysisContext(world).ownerMemberId,
  ]);
});
test('T011 all 24 meals and pre-trip ticket persist independently of pagination', async ({
  world,
}) => {
  const { seedPagedAnalysis } = await import('./fixture.js');
  await seedPagedAnalysis(world, 24, 'TWD', '10', 'TWD', '60');
  const s = await analysisSnapshot(world);
  expect(s.expenses).toHaveLength(25);
  expect(s.shares).toHaveLength(25);
  expect(s.trips![0]).toMatchObject({ name: '日本旅行' });
});
test('T012 another trip does not replace current scope', async ({ world }) => {
  const { seedPagedAnalysis, seedOtherAnalysisTrip } = await import('./fixture.js');
  await seedPagedAnalysis(world, 24, 'TWD', '10', 'TWD', '60');
  const id = analysisContext(world).tripId;
  await seedOtherAnalysisTrip(world, 'TWD', '900');
  expect(analysisContext(world).tripId).toBe(id);
  expect((await analysisSnapshot(world)).expenses).toHaveLength(25);
  const rows = (
    await world.db.query('SELECT amount_minor FROM expenses WHERE trip_id=$1', [
      world.get('analysis:otherTripId'),
    ])
  ).rows;
  expect(rows).toEqual([{ amount_minor: '90000' }]);
});
test('T013 repayments and completed settlement preserve original consumption', async ({
  world,
}) => {
  const { seedAnalysisPayments } = await import('./fixture.js');
  await seedAnalysisRows(
    world,
    Array.from({ length: 3 }, (_, i) => ({
      項目: `點心${i}`,
      分類: '餐飲',
      幣別: 'JPY',
      金額: '100',
      付款人: 'Alice',
      分攤者: 'Alice、Amy、Bob',
    })),
  );
  await seedAnalysisPayments(world, 'JPY', '100', 'JPY', '100');
  const s = await analysisSnapshot(world);
  expect(s.expenses).toHaveLength(3);
  expect(s.repayments).toHaveLength(2);
  expect(s.settlements).toHaveLength(1);
});
test('T030 historical source precision bypasses current currency unit without changing shares', async ({
  world,
}) => {
  const { seedHistoricalAnalysis } = await import('./fixture.js');
  await seedHistoricalAnalysis(world, 2, 'TWD', '1.01', 3, 'TWD', '0.001');
  const s = await analysisSnapshot(world);
  expect(s.shares).toHaveLength(4);
  expect(s.expenses!.map((e) => e.minor_unit).sort()).toEqual([2, 3]);
});

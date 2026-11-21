import { test, expect } from '../fixtures.js';
import { seedAnalysisRows, analysisSnapshot } from './fixture.js';
import { saveAnalysisAmount } from './mutations.js';

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
test('T014 saved amount and currency use authoritative edit', async ({ world }) => {
  await seedAnalysisRows(world, rows);
  await saveAnalysisAmount(world, '晚餐', 'USD', '30');
  expect((await analysisSnapshot(world)).expenses![0]).toMatchObject({
    currency_code: 'USD',
    amount_minor: '3000',
  });
});
test('T015 complete shares replace prior participants and preserve payment', async ({ world }) => {
  const { saveAnalysisShares } = await import('./mutations.js');
  await seedAnalysisRows(world, rows);
  await saveAnalysisShares(world, '晚餐', 'Bob');
  expect((await analysisSnapshot(world)).shares).toHaveLength(1);
});
test('T016 deletion removes only target and child shares', async ({ world }) => {
  const { deleteAnalysisExpense } = await import('./mutations.js');
  await seedAnalysisRows(world, [...rows, { ...rows[0]!, 項目: '保留' }]);
  await deleteAnalysisExpense(world, '晚餐');
  expect((await analysisSnapshot(world)).expenses!.map((e) => e.item)).toEqual(['保留']);
});
test('T017 rename retains category identity and expense association', async ({ world }) => {
  const { renameAnalysisCategory } = await import('./mutations.js');
  await seedAnalysisRows(world, rows);
  await renameAnalysisCategory(world, '餐飲', '吃喝');
  expect((await analysisSnapshot(world)).categories![0]).toMatchObject({ name: '吃喝' });
});
test('T018 clearing category does not create unclassified row or change shares', async ({
  world,
}) => {
  const { clearAnalysisCategory } = await import('./mutations.js');
  await seedAnalysisRows(world, rows);
  await clearAnalysisCategory(world, '晚餐');
  expect((await analysisSnapshot(world)).expenses![0]).toMatchObject({ category_id: null });
});
test('T019 disabling renamed member preserves historical shares and stable ID', async ({
  world,
}) => {
  const { disableAnalysisMember } = await import('./mutations.js');
  await seedAnalysisRows(world, rows);
  await disableAnalysisMember(world, 'Amy', '小美');
  expect((await analysisSnapshot(world)).shares).toHaveLength(3);
});

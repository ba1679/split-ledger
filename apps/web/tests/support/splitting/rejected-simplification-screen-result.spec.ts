import { test } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { openDirectSettlementScreen } from './direct-settlement-screen.js';
import { arrangeRejectedSimplificationSave } from './rejected-simplification-save.js';
import { toggleSimplification } from './toggle-simplification.js';
import { assertRejectedSimplificationScreen } from './rejected-simplification-screen-result.js';

test('T210: rejected mode save retains confirmed direct graph and offers retry without another write', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: '門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  await openDirectSettlementScreen(page, world);
  await arrangeRejectedSimplificationSave(page, world);
  try {
    await toggleSimplification(page, world, true);
    await assertRejectedSimplificationScreen(page, world);
  } finally {
    await world.get<{ restore(): Promise<void> }>('splitting:rejectedSimplificationSave').restore();
  }
});

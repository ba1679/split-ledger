import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { settlementScreenKey, type ConfirmedSettlementScreen } from './settlement-screen.js';
import { viewBrowserSettlement, viewSettlementPhrase } from './view-settlement.js';

test('T168: view the real settlement and retain its exact confirmed projection', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    { 項目: '車資', 幣別: 'TWD', 金額: '300', 付款人: 'Amy', 分攤者: 'Alice' },
  ]);
  await runIsolatedStep(
    {
      phrase: viewSettlementPhrase,
      input: undefined,
      execute: (context) => viewBrowserSettlement(page, context),
    },
    world,
  );
  const screen = world.get<ConfirmedSettlementScreen>(settlementScreenKey);
  expect(screen.snapshot.settlement.simplifyDebts).toBe(false);
  expect(screen.snapshot.settlement.arrangements.map((arrangement) => arrangement.amount)).toEqual(
    expect.arrayContaining([{ numerator: '100', denominator: '3', minorUnit: 0 }]),
  );
  expect(screen.text.trim()).not.toBe('');
});

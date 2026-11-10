import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { settlementBeforeKey, settlementWritesKey } from './settlement-form.js';
import {
  openAmySettlement,
  openAmySettlementPhrase,
  openedAmySettlementKey,
} from './open-amy-settlement.js';

test('T170: open the latest Amy arrangement without entering or saving a payment', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await runIsolatedStep(
    {
      phrase: openAmySettlementPhrase,
      input: undefined,
      execute: (context) => openAmySettlement(page, context),
    },
    world,
  );
  expect(world.get(openedAmySettlementKey)).toMatchObject({
    before: world.get(settlementBeforeKey),
    arrangement: { amount: { numerator: '100', denominator: '3', minorUnit: 0 } },
  });
  expect(world.get(settlementWritesKey)).toEqual([]);
  await expect(page.getByLabel('實付金額', { exact: true })).toHaveValue('33');
});

import { test } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { openBrowserSettlementForm } from './settlement-form.js';
import { changeSnackOnAnotherDevice, staleSettlementFormPhrase } from './stale-settlement-form.js';

test('T140: another real owner session updates the snack while the settlement form keeps its old command', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await openBrowserSettlementForm(page, world, 'Amy');
  await runIsolatedStep(
    {
      phrase: staleSettlementFormPhrase,
      input: undefined,
      execute: (context) => changeSnackOnAnotherDevice(page, context),
    },
    world,
  );
});

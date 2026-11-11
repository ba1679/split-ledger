import { test } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { seedBrowserIndependentRepayment } from './independent-repayment-fixture.js';
import { arrangeBrowserOverpaymentWarning } from './overpayment-warning.js';
import {
  lowerExpenseOnAnotherDevice,
  staleBrowserWarningPhrase,
} from './stale-overpayment-warning.js';

test('T133: second owner device corrects the source while the first keeps its old warning', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedBrowserIndependentRepayment(world, '400');
  await arrangeBrowserOverpaymentWarning(page, world);
  await runIsolatedStep(
    {
      phrase: staleBrowserWarningPhrase,
      input: undefined,
      execute: (context) => lowerExpenseOnAnotherDevice(page, context),
    },
    world,
  );
});

import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSettlement } from './fixture.js';
import { settleBrowserAmyArrangement } from './settled-arrangement-fixture.js';
import {
  openBrowserSettlementForm,
  settlementArrangement,
  settlementFormPhrase,
} from './settlement-form.js';

const amount = { numerator: '100', denominator: '3', minorUnit: 0 };

test('T136: Amy and Bob selection retains full rational obligation and rejects unsupported or missing payer', () => {
  const view: BrowserSettlement = {
    accountingRevision: '7',
    simplifyDebts: false,
    balances: [],
    arrangements: [
      {
        key: 'amy-key',
        debtorMemberId: 'amy',
        creditorMemberId: 'alice',
        currencyCode: 'JPY',
        amount,
      },
      {
        key: 'bob-key',
        debtorMemberId: 'bob',
        creditorMemberId: 'alice',
        currencyCode: 'JPY',
        amount,
      },
    ],
  };
  for (const payer of ['Amy', 'Bob']) {
    const row = settlementArrangement(view, payer, payer.toLowerCase(), 'alice');
    expect(row.key).toBe(`${payer.toLowerCase()}-key`);
    expect(row.amount).toEqual(amount);
    expect(row.amount).not.toBe(amount);
  }
  expect(() => settlementArrangement(view, 'Carol', 'amy', 'alice')).toThrow();
  expect(() => settlementArrangement(view, 'Amy', 'unknown', 'alice')).toThrow();
});

for (const payer of ['Amy', 'Bob'])
  test(`T136: isolated unsaved ${payer} settlement form Given`, async ({ page, world }) => {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    if (payer === 'Bob') await settleBrowserAmyArrangement(world);
    await runIsolatedStep(
      {
        phrase: settlementFormPhrase,
        input: payer,
        execute: (context, value) => openBrowserSettlementForm(page, context, value),
      },
      world,
    );
  });

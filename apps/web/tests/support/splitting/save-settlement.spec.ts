import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { openBrowserSettlementForm, type BrowserSettlementDraft } from './settlement-form.js';
import {
  assertOriginalSettlementCommand,
  saveBrowserSettlement,
  saveSettlementPhrase,
  settlementSubmissionOutcome,
} from './save-settlement.js';

test('T169: HTTP 5xx remains uncertain and a 409 is a rejected settlement', () => {
  expect(settlementSubmissionOutcome(201)).toBe('saved');
  for (const status of [400, 401, 404, 409, 422])
    expect(settlementSubmissionOutcome(status)).toBe('rejected');
  for (const status of [200, 500, 502, 503, 504])
    expect(settlementSubmissionOutcome(status)).toBe('unconfirmed');
});

test('T169: transport requires original exact fraction, both UUIDs, revision and paid date', () => {
  const draft: BrowserSettlementDraft = {
    id: '350b575a-a5b3-4c38-86c9-a6e94ac652dd',
    repaymentId: 'bac69d29-f3c9-4456-9a35-5f7d58f96744',
    arrangementKey: 'original-opaque-key',
    accountingRevision: '19',
    debtorMemberId: 'amy',
    creditorMemberId: 'alice',
    currencyCode: 'JPY',
    expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
    paidOn: '2027-03-12',
  };
  const command = { ...draft, paidAmount: '33' };
  assertOriginalSettlementCommand(command, draft, '33');
  assertOriginalSettlementCommand({ ...draft, paidAmount: '0' }, draft, '0');
  for (const changed of [
    { repaymentId: 'another-uuid' },
    { id: 'another-uuid' },
    { accountingRevision: '20' },
    { arrangementKey: 'refreshed-key' },
    { expectedAmount: { numerator: '3333', denominator: '1', minorUnit: 2 } },
    { paidOn: '2027-03-13' },
    { paidAmount: '34' },
    { roundingPolicy: 'nearest' },
  ])
    expect(() =>
      assertOriginalSettlementCommand({ ...command, ...changed }, draft, '33'),
    ).toThrow();
});

for (const amount of ['0', '33', '34', '700'])
  test(`T169: isolated real form submits JPY ${amount} once`, async ({ page, world }) => {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    await openBrowserSettlementForm(page, world, 'Amy');
    await runIsolatedStep(
      {
        phrase: saveSettlementPhrase,
        input: amount,
        execute: (context, paid) => saveBrowserSettlement(page, context, paid),
      },
      world,
    );
  });

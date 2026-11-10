import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserReferencedMember } from './referenced-member-fixture.js';
import { deactivateBrowserMember } from './deactivate-member.js';
import {
  assertDeactivatedMemberHistory,
  assertDeactivatedMemberHistoryScreen,
  deactivatedMemberHistoryPhrase,
} from './deactivated-member-history-result.js';
import type { BrowserSplittingSnapshot } from './fixture.js';

function snapshots(): [BrowserSplittingSnapshot, BrowserSplittingSnapshot] {
  const before = {
    sources: {
      trips: [],
      members: [{ id: 'member', name: '小美', is_active: true }],
      expenses: [{ id: 'lunch' }],
      shares: [{ expense_id: 'lunch', member_id: 'member' }],
      repayments: [{ id: 'payment', payer_member_id: 'member', amount_minor: '20' }],
      settlements: [],
      adjustments: [],
    },
    expenses: { items: [], totalCount: 1, nextCursor: null },
    repayments: { items: [{ id: 'payment', amount: '20' }] },
    totals: { totals: [] },
    settlement: {
      accountingRevision: '2',
      simplifyDebts: false,
      balances: [
        {
          memberId: 'member',
          currencyCode: 'JPY',
          netAmount: { numerator: '-80', denominator: '1', minorUnit: 0 },
        },
      ],
      arrangements: [],
    },
  } as BrowserSplittingSnapshot;
  const after = structuredClone(before);
  after.sources.members[0]!.is_active = false;
  after.settlement.accountingRevision = '3';

  return [before, after];
}

test('T183: preserved history oracle rejects deleted identities, rewritten shares, payments and balances', () => {
  const [before, after] = snapshots();
  expect(() => assertDeactivatedMemberHistory(before, after, 'member')).not.toThrow();
  for (const corrupt of [
    (value: BrowserSplittingSnapshot) => {
      value.sources.members[0]!.id = 'replacement';
    },
    (value: BrowserSplittingSnapshot) => {
      Object.assign(value.sources, { shares: [] });
    },
    (value: BrowserSplittingSnapshot) => {
      value.sources.repayments[0]!.amount_minor = '0';
    },
    (value: BrowserSplittingSnapshot) => {
      Object.assign(value.settlement.balances[0]!.netAmount, { numerator: '-100' });
    },
  ]) {
    const changed = structuredClone(after);
    corrupt(changed);
    expect(() => assertDeactivatedMemberHistory(before, changed, 'member')).toThrow();
  }
});

test('T183: deactivated member retains historical shares, repayment and net balance', async ({
  page,
  world,
}) => {
  await seedBrowserReferencedMember(page, world);
  await deactivateBrowserMember(page, world, '小美');
  await runIsolatedStep(
    {
      phrase: deactivatedMemberHistoryPhrase,
      input: '小美',
      execute: (context, name) => assertDeactivatedMemberHistoryScreen(page, context, name),
    },
    world,
  );
});

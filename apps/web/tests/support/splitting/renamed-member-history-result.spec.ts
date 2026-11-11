import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserReferencedMember } from './referenced-member-fixture.js';
import { renameBrowserMember } from './rename-member.js';
import {
  assertRenamedMemberHistory,
  assertRenamedMemberHistoryScreen,
  renamedMemberHistoryPhrase,
} from './renamed-member-history-result.js';
import type { BrowserSplittingSnapshot } from './fixture.js';

function snapshots(): [BrowserSplittingSnapshot, BrowserSplittingSnapshot] {
  const before = {
    sources: {
      trips: [],
      members: [{ id: 'member', name: '小美', name_key: '小美', is_active: true }],
      expenses: [{ id: 'lunch' }],
      shares: [{ expense_id: 'lunch', member_id: 'member' }],
      repayments: [{ id: 'payment', payer_member_id: 'member', amount_minor: '20' }],
      settlements: [],
      adjustments: [],
    },
    expenses: {
      items: [
        {
          id: 'lunch',
          item: '午餐',
          tripId: 'trip',
          amount: '300',
          currencyCode: 'JPY',
          minorUnit: 0,
          spentOn: '2027-03-11',
          category: null,
          payerMemberId: 'alice',
          shares: [
            { memberId: 'member', amount: { numerator: '100', denominator: '1', minorUnit: 0 } },
          ],
        },
      ],
      totalCount: 1,
      nextCursor: null,
    },
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
  after.sources.members[0]!.name = 'Amy';
  after.sources.members[0]!.name_key = 'amy';
  after.settlement.accountingRevision = '3';

  return [before, after];
}

test('T185: rename history oracle rejects deleted identities, rewritten shares, payments and balances', () => {
  const [before, after] = snapshots();
  expect(() => assertRenamedMemberHistory(before, after, 'member', 'Amy')).not.toThrow();
  for (const corrupt of [
    (value: BrowserSplittingSnapshot) => {
      value.sources.members[0]!.name_key = '小美';
    },
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
    expect(() => assertRenamedMemberHistory(before, changed, 'member', 'Amy')).toThrow();
  }
});

test('T185: renamed member retains historical UUID and refreshed displays', async ({
  page,
  world,
}) => {
  await seedBrowserReferencedMember(page, world);
  await renameBrowserMember(page, world, '小美', 'Amy');
  await runIsolatedStep(
    {
      phrase: renamedMemberHistoryPhrase,
      input: 'Amy',
      execute: (context, name) => assertRenamedMemberHistoryScreen(page, context, name),
    },
    world,
  );
});

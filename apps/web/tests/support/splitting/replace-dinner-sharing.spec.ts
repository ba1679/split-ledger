import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserExpense } from './fixture.js';
import {
  assertDinnerSharingPayload,
  replaceDinnerSharing,
  replaceDinnerSharingPhrase,
} from './replace-dinner-sharing.js';

test('T150: dinner PATCH changes payer and sharing without replacing identity or other fields', () => {
  const expense: BrowserExpense = {
    id: 'original',
    tripId: 'trip',
    item: '晚餐',
    amount: '300',
    currencyCode: 'JPY',
    minorUnit: 0,
    spentOn: '2027-03-11',
    category: null,
    payerMemberId: 'alice',
    shares: [],
  };
  assertDinnerSharingPayload(
    { amount: '200', payerMemberId: 'amy', shareMemberIds: ['bob', 'amy'] },
    expense,
    'amy',
    'bob',
  );
  for (const payload of [
    { amount: '200', payerMemberId: 'alice', shareMemberIds: ['amy', 'bob'] },
    { amount: '200', payerMemberId: 'amy', shareMemberIds: ['alice', 'amy', 'bob'] },
    { amount: '200', payerMemberId: 'amy', shareMemberIds: ['amy', 'bob'], id: 'replacement' },
    { amount: '200', payerMemberId: 'amy', shareMemberIds: ['amy', 'bob'], currencyCode: 'TWD' },
  ])
    expect(() => assertDinnerSharingPayload(payload, expense, 'amy', 'bob')).toThrow();
});

test('T150: existing dinner is changed through one real UI save and authoritative refresh', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await runIsolatedStep(
    {
      phrase: replaceDinnerSharingPhrase,
      input: undefined,
      execute: async (context) => replaceDinnerSharing(page, context),
    },
    world,
  );
});

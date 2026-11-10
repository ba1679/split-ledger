import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import {
  browserIndependentRepaymentPhrase,
  browserRepaymentFixtureKey,
  browserRepaymentRequest,
  seedBrowserIndependentRepayment,
} from './independent-repayment-fixture.js';

test('T105: repayment fixture accepts positive integer text only and reserves stable UUID/date', ({
  world,
}) => {
  world.splitting.ids.members.set('Alice', 'alice');
  world.splitting.ids.members.set('Amy', 'amy');
  expect(browserRepaymentRequest(world, '400', 'reserved')).toEqual({
    id: 'reserved',
    payerMemberId: 'amy',
    payeeMemberId: 'alice',
    amount: '400',
    currencyCode: 'JPY',
    paidOn: '2027-03-12',
  });
  for (const amount of ['0', '-1', '1.2', '1e3', ''])
    expect(() => browserRepaymentRequest(world, amount)).toThrow();
});

test('T105: isolated Given persists real partial repayment and stores authority snapshots', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await runIsolatedStep(
    {
      phrase: browserIndependentRepaymentPhrase,
      input: '400',
      execute: seedBrowserIndependentRepayment,
    },
    world,
  );
  const fixture = world.get<{
    repayment: { id: string; amount: string; paidOn: string };
    request: { id: string };
  }>(browserRepaymentFixtureKey);
  expect(fixture.repayment).toMatchObject({
    id: fixture.request.id,
    amount: '400',
    paidOn: '2027-03-12',
  });
  expect(page.url()).toBe('about:blank');
});

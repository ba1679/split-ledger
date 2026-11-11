import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import type { SourceSnapshot } from '../../../../api/tests/support/splitting/types.js';
import { seedBrowserMemberDirectory } from './member-directory-fixture.js';
import {
  assertMemberUnreferenced,
  unreferencedCarolPhrase,
  seedUnreferencedCarol,
  unreferencedCarolStateKey,
} from './unreferenced-carol-fixture.js';

test('T124: all financial member reference columns prevent an unreferenced claim', () => {
  const empty: SourceSnapshot = {
    trips: [],
    members: [],
    expenses: [],
    shares: [],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  expect(() => assertMemberUnreferenced(empty, 'carol')).not.toThrow();
  for (const [table, column] of [
    ['expenses', 'payer_member_id'],
    ['shares', 'member_id'],
    ['repayments', 'payer_member_id'],
    ['repayments', 'payee_member_id'],
    ['settlements', 'debtor_member_id'],
    ['settlements', 'creditor_member_id'],
    ['adjustments', 'member_id'],
  ] as const) {
    expect(() =>
      assertMemberUnreferenced({ ...empty, [table]: [{ [column]: 'carol' }] }, 'carol'),
    ).toThrow();
    expect(() =>
      assertMemberUnreferenced({ ...empty, [table]: [{ [column]: 'amy' }] }, 'carol'),
    ).not.toThrow();
  }
});

test('T124: create unused Carol with the real owner API and refresh the member query', async ({
  page,
  world,
}) => {
  await seedBrowserMemberDirectory(page, world);
  await runIsolatedStep(
    {
      phrase: unreferencedCarolPhrase,
      input: undefined,
      execute: (context) => seedUnreferencedCarol(page, context),
    },
    world,
  );
  expect(world.get(unreferencedCarolStateKey)).toBeDefined();
  expect(world.splitting.ids.members.has('Carol')).toBe(true);
});

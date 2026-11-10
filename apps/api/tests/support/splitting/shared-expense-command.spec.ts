import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers } from './members-fixture.js';
import {
  recordSharedExpense,
  sharedExpensePhrase,
  sharedExpenseRequest,
} from './shared-expense-command.js';
import { LedgerWorld } from '../world.js';
import type pg from 'pg';
import type { APIRequestContext } from '@playwright/test';

for (const shares of ['Alice、Amy、Bob', 'Amy、Bob', 'Alice']) {
  test(`T040 isolated shared expense with shares ${shares}`, async ({ world }) => {
    await seedSplittingMembers(world);
    await runIsolatedStep(
      {
        phrase: sharedExpensePhrase,
        input: [{ 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: shares }],
        execute: recordSharedExpense,
      },
      world,
    );
    expect(world.response!.status()).toBe(201);
    expect(world.get<Record<string, unknown>>('splitting:expenseRequest').id).toBe(
      world.get('splitting:expenseId'),
    );
  });
}

test('T040 request mapping preserves decimal text, fixed defaults and a preallocated UUID', () => {
  const world = new LedgerWorld(
    {} as pg.Pool,
    {} as APIRequestContext,
    'http://localhost',
    'isolated',
  );
  for (const name of ['Alice', 'Amy', 'Bob']) world.splitting.ids.members.set(name, `id-${name}`);
  const row = { 項目: '點心', 幣別: 'JPY', 金額: '100.00', 付款人: 'Alice', 分攤者: 'Amy、Bob' };
  expect(sharedExpenseRequest(world, [row], 'allocated-id')).toEqual({
    id: 'allocated-id',
    item: '點心',
    currencyCode: 'JPY',
    amount: '100.00',
    payerMemberId: 'id-Alice',
    shareMemberIds: ['id-Amy', 'id-Bob'],
    spentOn: '2027-01-20',
    categoryId: null,
  });
  expect(() => sharedExpenseRequest(world, [], 'allocated-id')).toThrow('exactly one');
  expect(() => sharedExpenseRequest(world, [row, row], 'allocated-id')).toThrow('exactly one');
});

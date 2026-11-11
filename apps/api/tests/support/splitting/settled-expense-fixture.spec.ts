import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedOriginalSettledExpense } from './settled-expense-fixture.js';
import type { SourceSnapshot } from './types.js';

test('T012: original expense has immutable 100 obligation, 33 paid and paired 67 adjustments', async ({
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: '原支出已以 Amy 實付 JPY 33 結清',
      input: undefined,
      execute: seedOriginalSettledExpense,
    },
    world,
  );
  const snapshot = world.get<SourceSnapshot>('splitting:historySnapshot');
  expect(world.get('splitting:originalExpenseId')).toBe(snapshot.expenses[0]!.id);
  expect(snapshot.settlements[0]!.obligation_numerator).toBe('100');
  expect(snapshot.repayments[0]!.amount_minor).toBe('33');
  expect(snapshot.adjustments.map((row) => row.numerator).sort()).toEqual(['-67', '67']);
});

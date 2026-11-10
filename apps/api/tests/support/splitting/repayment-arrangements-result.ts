import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { readAccessSettlement } from './access-fixture.js';
import {
  assertExactArrangementSet,
  assertExpenseArrangements,
  type ExpenseArrangementRow,
} from './expense-arrangements-result.js';
import { snapshotSplittingSources } from './expense-fixture.js';

export const repaymentArrangementsPhrase = '獨立還款後的付款安排如下：';

export async function assertRepaymentArrangements(
  world: LedgerWorld,
  rows: readonly ExpenseArrangementRow[],
): Promise<void> {
  expect(world.response!.status(), 'The original independent repayment POST must succeed').toBe(
    201,
  );
  // Shared source-only oracle includes expenses, shares, all payments and adjustments,
  // and compares the complete cross-currency set against the explicit table.
  await assertExpenseArrangements(world, rows);
  const beforeRead = await snapshotSplittingSources(world);
  const first = await readAccessSettlement(world);
  const repeated = await readAccessSettlement(world);
  expect(repeated.accountingRevision, 'Read-only projection must retain its revision').toBe(
    first.accountingRevision,
  );
  expect(repeated.simplifyDebts).toBe(first.simplifyDebts);
  assertExactArrangementSet(repeated.arrangements, first.arrangements);
  expect(repeated, 'Same revision must retain arrangement keys and deterministic order').toEqual(
    first,
  );
  expect(await snapshotSplittingSources(world)).toEqual(beforeRead);
}

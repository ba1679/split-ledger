import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { readAccessSettlement } from './access-fixture.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId } from './members-fixture.js';

export interface PendingSettlementSnapshot {
  id: string;
  repaymentId: string;
  arrangementKey: string;
  accountingRevision: string;
  debtorMemberId: string;
  creditorMemberId: string;
  currencyCode: string;
  expectedAmount: ExactAmount;
}

/** Reads one real projection and reserves command IDs without performing a settlement. */
export async function captureCurrentAmyArrangement(world: LedgerWorld): Promise<void> {
  const before = await snapshotSplittingSources(world);
  const view = await readAccessSettlement(world);
  const debtorMemberId = splittingMemberId(world, 'Amy');
  const creditorMemberId = splittingMemberId(world, 'Alice');
  const matches = view.arrangements.filter(
    (row) =>
      row.debtorMemberId === debtorMemberId &&
      row.creditorMemberId === creditorMemberId &&
      row.currencyCode === 'JPY',
  );

  expect(
    matches,
    'Product projection must expose one current Amy → Alice JPY arrangement',
  ).toHaveLength(1);
  const arrangement = matches[0]!;
  expect(arrangement.key).toEqual(expect.any(String));
  expect(arrangement.key.length).toBeGreaterThan(0);
  expect(arrangement.amount.numerator).toMatch(/^[1-9]\d*$/);
  expect(arrangement.amount.denominator).toMatch(/^[1-9]\d*$/);
  expect(Number.isInteger(arrangement.amount.minorUnit)).toBe(true);
  expect(arrangement.amount.minorUnit).toBeGreaterThanOrEqual(0);
  expect(arrangement.amount.minorUnit).toBeLessThanOrEqual(4);
  expect(view.accountingRevision).toBe(String(before.trips[0]!.accounting_revision));
  expect(view.simplifyDebts).toBe(before.trips[0]!.simplify_debts);
  const net = independentSplittingOracle.balance(before, debtorMemberId, 'JPY');
  expect(
    independentSplittingOracle.equal(arrangement.amount, {
      ...net,
      numerator: (-BigInt(net.numerator)).toString(),
    }),
    'The original rational arrangement must agree with independently reconstructed Amy debt',
  ).toBe(true);

  const pending: PendingSettlementSnapshot = {
    id: randomUUID(),
    repaymentId: randomUUID(),
    arrangementKey: arrangement.key,
    accountingRevision: view.accountingRevision,
    debtorMemberId,
    creditorMemberId,
    currencyCode: arrangement.currencyCode,
    expectedAmount: { ...arrangement.amount },
  };
  const after = await snapshotSplittingSources(world);
  expect(after, 'Reading an arrangement must not write accounting sources or revision').toEqual(
    before,
  );
  expect(after.settlements.some((row) => row.id === pending.id)).toBe(false);
  expect(after.repayments.some((row) => row.id === pending.repaymentId)).toBe(false);
  world.splitting.ids.settlements.set('pending', pending.id);
  world.splitting.ids.repayments.set('pending:settlement', pending.repaymentId);
  world.splitting.snapshot = after;
  world.set('splitting:settlementId', pending.id);
  world.set('splitting:settlementRepaymentId', pending.repaymentId);
  world.set('splitting:settlementSnapshot', pending);
  world.set('splitting:arrangement', arrangement);
  world.set('splitting:settlementView', view);
  world.set('splitting:revision', view.accountingRevision);
  world.set('splitting:sourceSnapshot', after);
  world.set('splitting:before', after);
}

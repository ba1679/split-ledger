import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { seedAmySettledBobOutstanding } from './sequential-settlement-fixture.js';
import type { SourceSnapshot } from './types.js';

export interface LostSettlementCommand {
  id: string;
  repaymentId: string;
  arrangementKey: string;
  accountingRevision: string;
  debtorMemberId: string;
  creditorMemberId: string;
  currencyCode: string;
  expectedAmount: ExactAmount;
  paidAmount: string;
  paidOn: string;
}

/** The write already committed; only its success response is unavailable to the caller. */
export async function seedLostSettlementResponse(world: LedgerWorld): Promise<void> {
  await seedAmySettledBobOutstanding(world);
  const snapshot = world.get<SourceSnapshot>('splitting:historySnapshot');
  const id = world.get<string>('splitting:settlementId');
  const repaymentId = world.get<string>('splitting:settlementRepaymentId');
  const settlement = snapshot.settlements.find((row) => row.id === id)!;
  const repayment = snapshot.repayments.find((row) => row.id === repaymentId)!;
  expect(settlement).toBeDefined();
  expect(repayment).toMatchObject({ settlement_id: id, amount_minor: '33', kind: 'settlement' });
  const paidOn = await world.db.query<{ paid_on: string }>(
    'SELECT paid_on::text FROM repayments WHERE id=$1',
    [repaymentId],
  );
  expect(paidOn.rows).toEqual([{ paid_on: '2027-01-20' }]);
  const command: LostSettlementCommand = {
    id,
    repaymentId,
    arrangementKey: String(settlement.arrangement_key),
    accountingRevision: String(settlement.source_revision),
    debtorMemberId: String(settlement.debtor_member_id),
    creditorMemberId: String(settlement.creditor_member_id),
    currencyCode: String(settlement.currency_code),
    expectedAmount: {
      numerator: String(settlement.obligation_numerator),
      denominator: String(settlement.obligation_denominator),
      minorUnit: Number(settlement.obligation_minor_unit),
    },
    paidAmount: '33',
    paidOn: paidOn.rows[0]!.paid_on,
  };
  expect(command.expectedAmount).toEqual({ numerator: '100', denominator: '3', minorUnit: 0 });
  expect(BigInt(snapshot.trips[0]!.accounting_revision as string)).toBe(
    BigInt(command.accountingRevision) + 1n,
  );
  // T020's pending Bob command is irrelevant to this read-only recovery scenario.
  world.state.delete('splitting:newSettlementId');
  world.state.delete('splitting:newRepaymentId');
  world.state.delete('splitting:arrangement');
  world.state.delete('splitting:expectedAmount');
  world.response = undefined;
  world.set('splitting:lostSettlementCommand', command);
  world.set('splitting:lostSettlementSnapshot', snapshot);
  world.set('splitting:lostSettlementResponse', true);
  world.set('splitting:before', snapshot);
  expect(await snapshotSplittingSources(world)).toEqual(snapshot);
}

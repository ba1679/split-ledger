import { and, eq } from 'drizzle-orm';
import { calculateSplitting } from '@split-ledger/shared';
import type { Database } from '../../db/index.js';
import {
  expenses,
  expenseShares,
  tripMembers,
  repayments,
  settlementAdjustments,
} from '../../db/schema.js';

/** Read through the caller's transaction, after its travel lock or snapshot has been established. */
export async function readSplittingCalculation(
  db: Pick<Database, 'select'>,
  ownerId: string,
  tripId: string,
) {
  const members = await db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.ownerId, ownerId), eq(tripMembers.tripId, tripId)));
  const sources = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.ownerId, ownerId), eq(expenses.tripId, tripId)));
  const shares = await db
    .select()
    .from(expenseShares)
    .where(and(eq(expenseShares.ownerId, ownerId), eq(expenseShares.tripId, tripId)));
  const payments = await db
    .select()
    .from(repayments)
    .where(and(eq(repayments.ownerId, ownerId), eq(repayments.tripId, tripId)));
  const adjustments = await db
    .select()
    .from(settlementAdjustments)
    .where(
      and(eq(settlementAdjustments.ownerId, ownerId), eq(settlementAdjustments.tripId, tripId)),
    );
  const calculated = calculateSplitting({
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      isOwner: member.role === 'owner',
      isActive: member.isActive,
    })),
    expenses: sources.map((expense) => ({
      ...expense,
      shareMemberIds: shares
        .filter((share) => share.expenseId === expense.id)
        .map((share) => share.memberId),
    })),
    repayments: payments.map((payment) => ({
      ...payment,
      fromMemberId: payment.payerMemberId,
      toMemberId: payment.payeeMemberId,
    })),
    adjustments: adjustments.map((adjustment) => ({
      ...adjustment,
      amount: {
        numerator: BigInt(adjustment.numerator),
        denominator: BigInt(adjustment.denominator),
      },
    })),
  });

  return { members, calculated };
}

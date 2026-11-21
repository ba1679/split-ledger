import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../../db/index.js';
import { categories, expenses, expenseShares, tripMembers } from '../../../db/schema.js';
import { notFound } from '../../../http.js';
import { requireOwnedTrip } from '../../splitting/trip-scope.js';
import { aggregateAnalysis } from './service.js';

export interface AnalysisScope {
  tripId: string;
  ownerId: string;
}

export function readExpenseAnalysis(db: Database, { tripId, ownerId }: AnalysisScope) {
  return db.transaction(
    async (tx) => {
      await requireOwnedTrip(tx, ownerId, tripId);
      const [member] = await tx
        .select({ id: tripMembers.id })
        .from(tripMembers)
        .where(
          and(
            eq(tripMembers.ownerId, ownerId),
            eq(tripMembers.tripId, tripId),
            eq(tripMembers.role, 'owner'),
          ),
        );
      if (!member) throw notFound();
      const rows = await tx
        .select({
          id: expenses.id,
          currencyCode: expenses.currencyCode,
          minorUnit: expenses.minorUnit,
          amountMinor: expenses.amountMinor,
          categoryId: categories.id,
          categoryName: categories.name,
        })
        .from(expenses)
        .leftJoin(
          categories,
          and(eq(categories.ownerId, expenses.ownerId), eq(categories.id, expenses.categoryId)),
        )
        .where(and(eq(expenses.ownerId, ownerId), eq(expenses.tripId, tripId)));
      // Read each trip's membership set once; both source reads share this transaction's snapshot.
      const shares = await tx
        .select({
          expenseId: expenseShares.expenseId,
          memberIds: sql<
            string[]
          >`array_agg(${expenseShares.memberId} order by ${expenseShares.memberId})`,
        })
        .from(expenseShares)
        .where(and(eq(expenseShares.ownerId, ownerId), eq(expenseShares.tripId, tripId)))
        .groupBy(expenseShares.expenseId);
      const membersByExpense = new Map(shares.map((row) => [row.expenseId, row.memberIds]));
      const sources = rows.map(({ id, categoryId, categoryName, ...row }) => ({
        ...row,
        shareMemberIds: membersByExpense.get(id) ?? [],
        category: categoryId === null ? null : { id: categoryId, name: categoryName! },
      }));

      return { tripId, ownerMemberId: member.id, ...aggregateAnalysis(sources, member.id) };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}

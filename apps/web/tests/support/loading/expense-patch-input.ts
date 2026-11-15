import type { Expense } from '../../../src/api/index.js';

/** Omitted PATCH fields preserve the original value; explicit null remains explicit null. */
export function effectiveExpenseInput(
  original: Expense,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return {
    item: original.item,
    amount: original.amount,
    currencyCode: original.currencyCode,
    spentOn: original.spentOn,
    categoryId: original.category?.id ?? null,
    payerMemberId: original.payerMemberId,
    shareMemberIds: original.shares.map((share) => share.memberId),
    ...patch,
  };
}

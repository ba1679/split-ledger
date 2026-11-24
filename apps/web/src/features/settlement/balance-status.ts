import type { ExactAmount } from '@split-ledger/shared';
import { formatShareAmount } from '../expenses/ExpenseShares.js';
import type { SettlementArrangement } from './types.js';

export function balanceStatus(
  sign: bigint,
  memberId: string,
  currency: string,
  arrangements: readonly SettlementArrangement[],
) {
  if (sign > 0n) return 'balance.receivable';
  if (sign < 0n) return 'balance.payable';

  return arrangements.some(
    (row) =>
      row.currencyCode === currency &&
      (row.debtorMemberId === memberId || row.creditorMemberId === memberId),
  )
    ? 'balance.zero'
    : 'balance.settled';
}

export function formatBalanceAmount(amount: ExactAmount, language: string | undefined) {
  const formatted = formatShareAmount(amount);

  return language === 'en' ? formatted.replace(/^-/u, '') : formatted;
}

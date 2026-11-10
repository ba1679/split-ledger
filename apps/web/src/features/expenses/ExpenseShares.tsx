import React from 'react';
import type { ExactAmount } from '@split-ledger/shared';
import type { Expense, TripMember } from '../../api/index.js';

/** Round only the presentation, using integer arithmetic even for very large fractions. */
export function formatShareAmount(amount: ExactAmount): string {
  const numerator = BigInt(amount.numerator);
  const absolute = numerator < 0n ? -numerator : numerator;
  const divisor = BigInt(amount.denominator) * 10n ** BigInt(amount.minorUnit);
  const hundredths = (absolute * 100n * 2n + divisor) / (divisor * 2n);
  const fraction = (hundredths % 100n).toString().padStart(2, '0').replace(/0+$/, '');

  return `${numerator < 0n && hundredths !== 0n ? '-' : ''}${hundredths / 100n}${fraction ? `.${fraction}` : ''}`;
}

export function ExpenseShares({ expense, members }: { expense: Expense; members: TripMember[] }) {
  const names = new Map(members.map((member) => [member.id, member.name]));

  return (
    <div className="saved-expense-sharing">
      <p className="field-hint">{names.get(expense.payerMemberId)} 付款</p>
      <ul className="expense-share-list" aria-label="支出分攤">
        {expense.shares.map((share) => {
          const display = `${expense.currencyCode} ${formatShareAmount(share.amount)}`;

          return (
            <li key={share.memberId}>
              <span>{names.get(share.memberId)}</span>{' '}
              <output aria-label={display}>{display}</output>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

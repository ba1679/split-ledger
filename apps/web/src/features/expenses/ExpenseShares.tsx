import React from 'react';
import type { ExactAmount } from '@split-ledger/shared';
import type { Expense, TripMember } from '../../api/index.js';

/** Round only the presentation, using integer arithmetic even for very large fractions. */
export function formatShareAmount(amount: ExactAmount, minimumFractionDigits = 0): string {
  const numerator = BigInt(amount.numerator);
  const absolute = numerator < 0n ? -numerator : numerator;
  const divisor = BigInt(amount.denominator) * 10n ** BigInt(amount.minorUnit);
  const digits = Math.max(2, minimumFractionDigits);
  const scale = 10n ** BigInt(digits);
  const rounded = (absolute * scale * 2n + divisor) / (divisor * 2n);
  const fraction = (rounded % scale)
    .toString()
    .padStart(digits, '0')
    .replace(/0+$/, '')
    .padEnd(minimumFractionDigits, '0');

  return `${numerator < 0n && rounded !== 0n ? '-' : ''}${rounded / scale}${fraction ? `.${fraction}` : ''}`;
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

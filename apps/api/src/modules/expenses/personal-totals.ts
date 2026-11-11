import { addRational, exactAmount, rational, type Rational } from '@split-ledger/shared';

interface ExpenseShareSource {
  currencyCode: string;
  minorUnit: number;
  amountMinor: bigint;
  shareMemberIds: string[];
}

/** Consumption belongs to participants, independently of who paid or repaid it. */
export function personalTotals(rows: ExpenseShareSource[], memberId: string) {
  const groups = new Map<string, { amount: Rational; unit: number }>();
  for (const row of rows) {
    if (!row.shareMemberIds.includes(memberId)) continue;
    const prior = groups.get(row.currencyCode);
    const unit = Math.max(prior?.unit ?? row.minorUnit, row.minorUnit);
    const share = rational(
      row.amountMinor * 10n ** BigInt(unit - row.minorUnit),
      BigInt(row.shareMemberIds.length),
    );
    const previous = prior
      ? rational(
          prior.amount.numerator * 10n ** BigInt(unit - prior.unit),
          prior.amount.denominator,
        )
      : rational(0n);

    groups.set(row.currencyCode, { amount: addRational(previous, share), unit });
  }

  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currencyCode, group]) => ({
      currencyCode,
      amount: exactAmount(group.amount, group.unit),
    }));
}

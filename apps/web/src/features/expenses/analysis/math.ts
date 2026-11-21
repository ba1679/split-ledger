import { addRational, rational, type ExactAmount } from '@split-ledger/shared';

export function formatAnalysisPercent(amount: ExactAmount, total: ExactAmount): string | null {
  const n = BigInt(amount.numerator) * BigInt(total.denominator) * 10n ** BigInt(total.minorUnit);
  const d = BigInt(amount.denominator) * BigInt(total.numerator) * 10n ** BigInt(amount.minorUnit);
  if (d === 0n) return null;
  if (n > 0n && n * 10000n < d) return '小於0.01%';
  const rounded = (n * 20000n + d) / (d * 2n);
  const fraction = String(rounded % 100n)
    .padStart(2, '0')
    .replace(/0+$/, '');

  return `${rounded / 100n}${fraction ? '.' + fraction : ''}%`;
}

/** Quantize cumulative endpoints, keeping all Number values within 10^12. */
export function chartWeights(amounts: ExactAmount[]): number[] {
  const values = amounts.map((a) =>
    rational(BigInt(a.numerator), BigInt(a.denominator) * 10n ** BigInt(a.minorUnit)),
  );
  const total = values.reduce(addRational, rational(0n));
  if (total.numerator === 0n) return amounts.map(() => 0);
  let cumulative = rational(0n),
    previous = 0n;

  return values.map((value) => {
    cumulative = addRational(cumulative, value);
    const endpoint =
      (cumulative.numerator * total.denominator * 1_000_000_000_000n) /
      (cumulative.denominator * total.numerator);
    const weight = Number(endpoint - previous);
    previous = endpoint;

    return weight;
  });
}

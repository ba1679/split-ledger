import type { ExactAmount } from './splitting.js';
import { exactAmount, rational } from './rational.js';

/** Keep existing sub-minor-unit tail handling; payable debt is never forgiven. */
export function classifyArrangementPayment(
  obligation: ExactAmount,
  paidMinor: bigint,
  paidUnit: number,
) {
  const unit = Math.max(obligation.minorUnit, paidUnit);
  const remainder = rational(
    BigInt(obligation.numerator) * 10n ** BigInt(unit - obligation.minorUnit) -
      paidMinor * 10n ** BigInt(unit - paidUnit) * BigInt(obligation.denominator),
    BigInt(obligation.denominator),
  );

  return {
    partial: remainder.numerator >= remainder.denominator * 10n ** BigInt(unit - paidUnit),
    remainingAmount: exactAmount(remainder, unit),
  };
}

/** Prefill editable legal cash using integer rounding, never the rounded screen label. */
export function prefillArrangementPayment(
  obligation: ExactAmount,
  precision: number,
  currencyCode: string,
): string {
  const inputUnit = currencyCode === 'TWD' ? 0 : precision;
  const divisor = BigInt(obligation.denominator) * 10n ** BigInt(obligation.minorUnit);
  let units =
    (BigInt(obligation.numerator) * 10n ** BigInt(inputUnit) * 2n + divisor) / (divisor * 2n);
  const atPrecision = (value: bigint) => value * 10n ** BigInt(precision - inputUnit);
  if (units === 0n || classifyArrangementPayment(obligation, atPrecision(units), precision).partial)
    units++;
  const digits = units.toString().padStart(inputUnit + 1, '0');

  return inputUnit ? `${digits.slice(0, -inputUnit)}.${digits.slice(-inputUnit)}` : digits;
}

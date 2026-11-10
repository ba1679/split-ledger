import type { ExactAmount, Rational } from './splitting.js';

/** Canonical signed rational; the denominator is always positive, including zero as 0/1. */
export function rational(numerator: bigint, denominator = 1n): Rational {
  if (denominator === 0n) throw new RangeError('Zero rational denominator');
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  let a = numerator < 0n ? -numerator : numerator;
  let b = denominator;
  while (b !== 0n) [a, b] = [b, a % b];

  return { numerator: numerator / a, denominator: denominator / a };
}

export function addRational(a: Rational, b: Rational): Rational {
  return rational(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  );
}

export function negateRational(value: Rational): Rational {
  return { numerator: -value.numerator, denominator: value.denominator };
}

export function exactAmount(amount: Rational, minorUnit: number): ExactAmount {
  const normalized = rational(amount.numerator, amount.denominator);

  return {
    numerator: normalized.numerator.toString(),
    denominator: normalized.denominator.toString(),
    minorUnit,
  };
}

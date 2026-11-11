import { describe, expect, test } from 'vitest';
import * as shared from '../src/index.js';
import type {
  CalculateSplitting,
  SplittingInput,
  SplittingResult,
  Rational,
} from '../src/splitting.js';

// Missing implementation is an explicit product assertion, never a missing named import.
function calculate(input: SplittingInput): SplittingResult {
  const implementation = (shared as unknown as { calculateSplitting?: CalculateSplitting })
    .calculateSplitting;
  expect(
    implementation,
    'Product must export calculateSplitting implementing the declared pure boundary',
  ).toBeTypeOf('function');

  return implementation!(input);
}

const members = ['Alice', 'Amy', 'Bob'].map((id) => ({
  id,
  name: id,
  isOwner: id === 'Alice',
  isActive: true,
}));

function base(): SplittingInput {
  return { members, expenses: [], repayments: [], adjustments: [] };
}

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  while (b !== 0n) [a, b] = [b, a % b];

  return a;
}

function add(a: Rational, b: Rational): Rational {
  const n = a.numerator * b.denominator + b.numerator * a.denominator,
    d = a.denominator * b.denominator;
  const divisor = gcd(n, d);

  return { numerator: n / divisor, denominator: d / divisor };
}

function canonical(value: Rational): void {
  expect(typeof value.numerator).toBe('bigint');
  expect(typeof value.denominator).toBe('bigint');
  expect(value.denominator).toBeGreaterThan(0n);
  expect(gcd(value.numerator, value.denominator)).toBe(1n);
  if (value.numerator === 0n) expect(value.denominator).toBe(1n);
}

/** Independent expected nets in major units, with no production arithmetic imports. */
function oracle(input: SplittingInput, member: string, currency: string): Rational {
  let net: Rational = { numerator: 0n, denominator: 1n };
  for (const expense of input.expenses.filter((row) => row.currencyCode === currency)) {
    const scale = 10n ** BigInt(expense.minorUnit);
    if (expense.payerMemberId === member)
      net = add(net, { numerator: expense.amountMinor, denominator: scale });
    if (expense.shareMemberIds.includes(member))
      net = add(net, {
        numerator: -expense.amountMinor,
        denominator: scale * BigInt(expense.shareMemberIds.length),
      });
  }
  for (const payment of input.repayments.filter((row) => row.currencyCode === currency)) {
    const denominator = 10n ** BigInt(payment.minorUnit);
    if (payment.fromMemberId === member)
      net = add(net, { numerator: payment.amountMinor, denominator });
    if (payment.toMemberId === member)
      net = add(net, { numerator: -payment.amountMinor, denominator });
  }
  for (const adjustment of input.adjustments.filter(
    (row) => row.memberId === member && row.currencyCode === currency,
  ))
    net = add(net, {
      numerator: adjustment.amount.numerator,
      denominator: adjustment.amount.denominator * 10n ** BigInt(adjustment.minorUnit),
    });

  return net;
}

function assertResult(input: SplittingInput, result: SplittingResult): void {
  const currencies = new Set(
    [...input.expenses, ...input.repayments, ...input.adjustments].map((row) => row.currencyCode),
  );
  const seen = new Set<string>();
  const sums = new Map<string, Rational>();
  for (const row of result.balances) {
    expect(input.members.some((member) => member.id === row.memberId)).toBe(true);
    expect(currencies.has(row.currencyCode)).toBe(true);
    expect(Number.isInteger(row.minorUnit) && row.minorUnit >= 0 && row.minorUnit <= 4).toBe(true);
    const key = JSON.stringify([row.memberId, row.currencyCode]);
    expect(seen.has(key)).toBe(false);
    seen.add(key);
    canonical(row.amount);
    const major = {
      numerator: row.amount.numerator,
      denominator: row.amount.denominator * 10n ** BigInt(row.minorUnit),
    };
    const wanted = oracle(input, row.memberId, row.currencyCode);
    expect(major.numerator * wanted.denominator).toBe(wanted.numerator * major.denominator);
    sums.set(
      row.currencyCode,
      add(sums.get(row.currencyCode) ?? { numerator: 0n, denominator: 1n }, major),
    );
  }
  for (const currency of currencies) {
    for (const member of input.members)
      if (oracle(input, member.id, currency).numerator !== 0n)
        expect(seen.has(JSON.stringify([member.id, currency]))).toBe(true);
    expect(sums.get(currency)?.numerator ?? 0n).toBe(0n);
  }
  for (const edges of [result.directArrangements, result.simplifiedArrangements])
    for (const edge of edges) {
      canonical(edge.amount);
      expect(edge.amount.numerator).toBeGreaterThan(0n);
    }
}

function majorNet(result: SplittingResult, member: string, currency: string): Rational {
  const row = result.balances.find(
    (item) => item.memberId === member && item.currencyCode === currency,
  );
  if (!row) return { numerator: 0n, denominator: 1n };

  return add(
    { numerator: 0n, denominator: 1n },
    {
      numerator: row.amount.numerator,
      denominator: row.amount.denominator * 10n ** BigInt(row.minorUnit),
    },
  );
}

describe('T083 exact splitting invariants', () => {
  test('100/3 stays rational, reduced and signed; participant shares sum to 100', () => {
    const input: SplittingInput = {
      ...base(),
      expenses: [
        {
          id: 'snack',
          payerMemberId: 'Alice',
          shareMemberIds: ['Alice', 'Amy', 'Bob'],
          currencyCode: 'JPY',
          minorUnit: 0,
          amountMinor: 100n,
        },
      ],
    };
    const result = calculate(input);
    assertResult(input, result);
    expect(majorNet(result, 'Alice', 'JPY')).toEqual({ numerator: 200n, denominator: 3n });
    expect(majorNet(result, 'Amy', 'JPY')).toEqual({ numerator: -100n, denominator: 3n });
    expect(majorNet(result, 'Bob', 'JPY')).toEqual({ numerator: -100n, denominator: 3n });
    // Reconstruct the payer's own share and the other two from actual product nets.
    const payerShare = add(
      { numerator: 100n, denominator: 1n },
      {
        numerator: -majorNet(result, 'Alice', 'JPY').numerator,
        denominator: majorNet(result, 'Alice', 'JPY').denominator,
      },
    );
    const sum = add(
      add(payerShare, {
        numerator: -majorNet(result, 'Amy', 'JPY').numerator,
        denominator: majorNet(result, 'Amy', 'JPY').denominator,
      }),
      {
        numerator: -majorNet(result, 'Bob', 'JPY').numerator,
        denominator: majorNet(result, 'Bob', 'JPY').denominator,
      },
    );
    expect(sum).toEqual({ numerator: 100n, denominator: 1n });
  });

  test('mixed historical scales and signed repayment/adjustment contributions stay exact', () => {
    const input: SplittingInput = {
      ...base(),
      expenses: [
        {
          id: 'old',
          payerMemberId: 'Alice',
          shareMemberIds: ['Alice', 'Amy'],
          currencyCode: 'TWD',
          minorUnit: 2,
          amountMinor: 123n,
        },
        {
          id: 'new',
          payerMemberId: 'Alice',
          shareMemberIds: ['Alice', 'Amy'],
          currencyCode: 'TWD',
          minorUnit: 0,
          amountMinor: 1n,
        },
        {
          id: 'yen',
          payerMemberId: 'Bob',
          shareMemberIds: ['Alice'],
          currencyCode: 'JPY',
          minorUnit: 0,
          amountMinor: 100n,
        },
      ],
      repayments: [
        {
          id: 'cash',
          fromMemberId: 'Amy',
          toMemberId: 'Alice',
          currencyCode: 'TWD',
          minorUnit: 2,
          amountMinor: 50n,
        },
      ],
      adjustments: [
        {
          settlementId: 'settled',
          memberId: 'Alice',
          currencyCode: 'TWD',
          minorUnit: 2,
          amount: { numerator: -2n, denominator: 6n },
        },
        {
          settlementId: 'settled',
          memberId: 'Amy',
          currencyCode: 'TWD',
          minorUnit: 2,
          amount: { numerator: 2n, denominator: 6n },
        },
      ],
    };
    const result = calculate(input);
    assertResult(input, result);
    expect(majorNet(result, 'Alice', 'TWD')).toEqual({ numerator: 367n, denominator: 600n });
    expect(majorNet(result, 'Amy', 'TWD')).toEqual({ numerator: -367n, denominator: 600n });
    expect(majorNet(result, 'Alice', 'JPY')).toEqual({ numerator: -100n, denominator: 1n });
    expect(majorNet(result, 'Bob', 'JPY')).toEqual({ numerator: 100n, denominator: 1n });
  });

  test('exact cancellation uses 0/1 for every retained zero', () => {
    const input: SplittingInput = {
      ...base(),
      expenses: [
        {
          id: 'debt',
          payerMemberId: 'Alice',
          shareMemberIds: ['Amy'],
          currencyCode: 'JPY',
          minorUnit: 0,
          amountMinor: 100n,
        },
      ],
      repayments: [
        {
          id: 'paid',
          fromMemberId: 'Amy',
          toMemberId: 'Alice',
          currencyCode: 'JPY',
          minorUnit: 0,
          amountMinor: 100n,
        },
      ],
    };
    const result = calculate(input);
    assertResult(input, result);
    for (const row of result.balances)
      expect(row.amount).toEqual({ numerator: 0n, denominator: 1n });
    expect(result.directArrangements).toEqual([]);
    expect(result.simplifiedArrangements).toEqual([]);
  });

  test('deterministic small matrix preserves exact signed zero sums without mutating input', () => {
    for (const payer of members)
      for (let mask = 1; mask < 8; mask++)
        for (const amount of [1n, 2n, 100n, 9007199254740993n]) {
          const input: SplittingInput = {
            ...base(),
            expenses: [
              {
                id: `expense-${payer.id}-${mask}-${amount}`,
                payerMemberId: payer.id,
                shareMemberIds: members
                  .filter((_, index) => (mask & (1 << index)) !== 0)
                  .map((member) => member.id),
                currencyCode: 'JPY',
                minorUnit: 0,
                amountMinor: amount,
              },
            ],
          };
          const before = structuredClone(input);
          const first = calculate(input);
          assertResult(input, first);
          expect(calculate(input)).toEqual(first);
          expect(input).toEqual(before);
        }
  });
});

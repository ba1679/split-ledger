/** An amount in historical minor units, serialized without precision loss. */
export interface ExactAmount {
  readonly numerator: string;
  readonly denominator: string;
  readonly minorUnit: number;
}

/** Internal arithmetic value; implementations must normalize to a positive denominator. */
export interface Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

export interface SplittingCurrency {
  readonly currencyCode: string;
  readonly minorUnit: number;
}

export interface SplittingMember {
  readonly id: string;
  readonly name: string;
  readonly isOwner: boolean;
  readonly isActive: boolean;
}

export interface SharedExpenseInput extends SplittingCurrency {
  readonly id: string;
  readonly payerMemberId: string;
  readonly shareMemberIds: readonly string[];
  readonly amountMinor: bigint;
}

export interface RepaymentInput extends SplittingCurrency {
  readonly id: string;
  readonly fromMemberId: string;
  readonly toMemberId: string;
  readonly amountMinor: bigint;
}

export interface SettlementAdjustmentInput extends SplittingCurrency {
  readonly settlementId: string;
  readonly memberId: string;
  readonly amount: Rational;
}

export interface MemberBalance extends SplittingCurrency {
  readonly memberId: string;
  readonly amount: Rational;
}

export interface PaymentArrangement extends SplittingCurrency {
  readonly fromMemberId: string;
  readonly toMemberId: string;
  readonly amount: Rational;
}

export interface SplittingInput {
  readonly members: readonly SplittingMember[];
  readonly expenses: readonly SharedExpenseInput[];
  readonly repayments: readonly RepaymentInput[];
  readonly adjustments: readonly SettlementAdjustmentInput[];
}

export interface SplittingResult {
  readonly balances: readonly MemberBalance[];
  readonly directArrangements: readonly PaymentArrangement[];
  readonly simplifiedArrangements: readonly PaymentArrangement[];
}

/** Pure-function boundary; accounting implementation is supplied by the feature phase. */
export type CalculateSplitting = (input: SplittingInput) => SplittingResult;

import { addRational, negateRational, rational } from './rational.js';

/** Pair the largest remaining debts and credits; stable IDs break equal-amount ties. */
function netArrangements(balances: readonly MemberBalance[]): PaymentArrangement[] {
  const result: PaymentArrangement[] = [];
  const compare = (a: Rational, b: Rational) =>
    a.numerator * b.denominator - b.numerator * a.denominator;
  for (const currencyCode of [...new Set(balances.map((row) => row.currencyCode))].sort()) {
    const rows = balances.filter((row) => row.currencyCode === currencyCode);
    const debtors = rows
      .filter((row) => row.amount.numerator < 0n)
      .map((row) => ({ ...row, amount: negateRational(row.amount) }));
    const creditors = rows.filter((row) => row.amount.numerator > 0n).map((row) => ({ ...row }));
    const order = (a: MemberBalance, b: MemberBalance) => {
      const difference = compare(b.amount, a.amount);

      return difference < 0n
        ? -1
        : difference > 0n
          ? 1
          : a.memberId < b.memberId
            ? -1
            : a.memberId > b.memberId
              ? 1
              : 0;
    };
    while (debtors.length && creditors.length) {
      debtors.sort(order);
      creditors.sort(order);
      const debtor = debtors[0]!;
      const creditor = creditors[0]!;
      const amount =
        compare(debtor.amount, creditor.amount) <= 0n ? debtor.amount : creditor.amount;
      result.push({
        currencyCode,
        minorUnit: debtor.minorUnit,
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount,
      });
      debtor.amount = addRational(debtor.amount, negateRational(amount));
      creditor.amount = addRational(creditor.amount, negateRational(amount));
      if (debtor.amount.numerator === 0n) debtors.shift();
      if (creditor.amount.numerator === 0n) creditors.shift();
    }
  }

  return result.sort(
    (a, b) =>
      a.currencyCode.localeCompare(b.currencyCode) ||
      a.fromMemberId.localeCompare(b.fromMemberId) ||
      a.toMemberId.localeCompare(b.toMemberId),
  );
}

/** Reconstruct exact signed nets and pairwise direct debts from immutable source facts. */
export const calculateSplitting: CalculateSplitting = (input) => {
  const scales = new Map<string, number>();
  for (const source of [...input.expenses, ...input.repayments, ...input.adjustments])
    scales.set(
      source.currencyCode,
      Math.max(scales.get(source.currencyCode) ?? 0, source.minorUnit),
    );
  const balances: MemberBalance[] = [];
  const directArrangements: PaymentArrangement[] = [];
  for (const [currencyCode, minorUnit] of [...scales].sort(([a], [b]) => a.localeCompare(b))) {
    const nets = new Map(input.members.map((member) => [member.id, rational(0n)]));
    const pairs = new Map<string, { from: string; to: string; amount: Rational }>();
    const atScale = (amount: Rational, fromUnit: number) =>
      rational(amount.numerator * 10n ** BigInt(minorUnit - fromUnit), amount.denominator);
    const net = (member: string, amount: Rational) => {
      nets.set(member, addRational(nets.get(member) ?? rational(0n), amount));
    };
    const edge = (from: string, to: string, amount: Rational) => {
      if (from === to || amount.numerator === 0n) return;
      const [a, b] = [from, to].sort() as [string, string];
      const key = JSON.stringify([a, b]);
      const prior = pairs.get(key);
      pairs.set(key, {
        from: a,
        to: b,
        amount: addRational(
          prior?.amount ?? rational(0n),
          from === a ? amount : negateRational(amount),
        ),
      });
    };
    for (const expense of input.expenses.filter((row) => row.currencyCode === currencyCode)) {
      const amount = atScale(rational(expense.amountMinor), expense.minorUnit);
      const share = rational(
        amount.numerator,
        amount.denominator * BigInt(expense.shareMemberIds.length),
      );
      net(expense.payerMemberId, amount);
      for (const member of expense.shareMemberIds) {
        net(member, negateRational(share));
        edge(member, expense.payerMemberId, share);
      }
    }
    for (const payment of input.repayments.filter((row) => row.currencyCode === currencyCode)) {
      const amount = atScale(rational(payment.amountMinor), payment.minorUnit);
      net(payment.fromMemberId, amount);
      net(payment.toMemberId, negateRational(amount));
      edge(payment.toMemberId, payment.fromMemberId, amount);
    }
    const adjustments = input.adjustments.filter((row) => row.currencyCode === currencyCode);
    for (const adjustment of adjustments)
      net(adjustment.memberId, atScale(adjustment.amount, adjustment.minorUnit));
    // Each immutable settlement contributes exactly two opposite adjustments.
    for (const adjustment of adjustments.filter((row) => row.amount.numerator > 0n)) {
      const opposite = adjustments.find(
        (row) => row.settlementId === adjustment.settlementId && row.amount.numerator < 0n,
      );
      if (opposite)
        edge(
          opposite.memberId,
          adjustment.memberId,
          atScale(adjustment.amount, adjustment.minorUnit),
        );
    }
    for (const [memberId, amount] of [...nets].sort(([a], [b]) => a.localeCompare(b)))
      balances.push({ memberId, currencyCode, minorUnit, amount });
    for (const pair of pairs.values()) {
      if (pair.amount.numerator === 0n) continue;
      const forward = pair.amount.numerator > 0n;
      directArrangements.push({
        fromMemberId: forward ? pair.from : pair.to,
        toMemberId: forward ? pair.to : pair.from,
        currencyCode,
        minorUnit,
        amount: forward ? pair.amount : negateRational(pair.amount),
      });
    }
  }
  directArrangements.sort(
    (a, b) =>
      a.currencyCode.localeCompare(b.currencyCode) ||
      a.fromMemberId.localeCompare(b.fromMemberId) ||
      a.toMemberId.localeCompare(b.toMemberId),
  );

  const candidate = netArrangements(balances);

  return {
    balances,
    directArrangements,
    simplifiedArrangements:
      candidate.length <= directArrangements.length ? candidate : directArrangements,
  };
};

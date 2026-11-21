import { addRational, exactAmount, rational, type Rational } from '@split-ledger/shared';

export interface AnalysisSource {
  currencyCode: string;
  minorUnit: number;
  amountMinor: bigint;
  shareMemberIds: string[];
  category: { id: string; name: string } | null;
}

type CategorySum = { category: AnalysisSource['category']; amount: Rational };

/** Both projections use the same sources and historical currency scale. */
export function aggregateAnalysis(rows: AnalysisSource[], ownerMemberId: string) {
  const sourcesByCurrency = new Map<string, { minorUnit: number; sources: AnalysisSource[] }>();
  for (const row of rows) {
    const bucket = sourcesByCurrency.get(row.currencyCode) ?? { minorUnit: 0, sources: [] };
    bucket.minorUnit = Math.max(bucket.minorUnit, row.minorUnit);
    bucket.sources.push(row);
    sourcesByCurrency.set(row.currencyCode, bucket);
  }

  const currencies = [...sourcesByCurrency]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currencyCode, { minorUnit, sources }]) => {
      const personal = new Map<string, CategorySum>();
      const group = new Map<string, CategorySum>();
      const add = (sums: Map<string, CategorySum>, row: AnalysisSource, amount: Rational) => {
        const key = row.category?.id ?? '';
        const previous = sums.get(key);
        sums.set(key, {
          category: row.category,
          amount: addRational(previous?.amount ?? rational(0n), amount),
        });
      };
      for (const row of sources) {
        const members = new Set(row.shareMemberIds);
        if (members.size === 0) throw new Error('Expense has no share members');
        const amount = row.amountMinor * 10n ** BigInt(minorUnit - row.minorUnit);
        if (members.has(ownerMemberId)) add(personal, row, rational(amount, BigInt(members.size)));
        if (members.size >= 2) add(group, row, rational(amount));
      }
      const chart = (sums: Map<string, CategorySum>) => {
        const entries = [...sums]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, sum]) => sum)
          .filter((sum) => sum.amount.numerator > 0n);
        const total = entries.reduce((value, sum) => addRational(value, sum.amount), rational(0n));

        return {
          total: exactAmount(total, minorUnit),
          categories: entries.map((sum) => ({
            category: sum.category,
            amount: exactAmount(sum.amount, minorUnit),
          })),
        };
      };

      return { currencyCode, minorUnit, personal: chart(personal), group: chart(group) };
    });

  return {
    hasSharedExpenses: rows.some((row) => new Set(row.shareMemberIds).size >= 2),
    currencies,
  };
}

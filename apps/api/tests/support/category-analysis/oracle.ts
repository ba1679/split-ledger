import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { analysisContext } from './fixture.js';

export type Source = Record<string, Record<string, unknown>[]>;

export interface OracleCategory {
  category: { id: string; name: string } | null;
  amount: ExactAmount;
}

export interface OracleChart {
  total: ExactAmount;
  categories: OracleCategory[];
}

export interface OracleCurrency {
  currencyCode: string;
  minorUnit: number;
  personal: OracleChart;
  group: OracleChart;
}

export function fraction(n: bigint, d = 1n, minorUnit = 0): ExactAmount {
  if (d <= 0n) throw Error('Invalid independent oracle denominator');
  let a = n < 0n ? -n : n,
    b = d;
  while (b) {
    const r = a % b;
    a = b;
    b = r;
  }

  return { numerator: String(n / a), denominator: String(d / a), minorUnit };
}

export function add(left: ExactAmount, right: ExactAmount): ExactAmount {
  const unit = Math.max(left.minorUnit, right.minorUnit),
    n = BigInt(left.numerator) * 10n ** BigInt(unit - left.minorUnit),
    m = BigInt(right.numerator) * 10n ** BigInt(unit - right.minorUnit);

  return fraction(
    n * BigInt(right.denominator) + m * BigInt(left.denominator),
    BigInt(left.denominator) * BigInt(right.denominator),
    unit,
  );
}

export function expectedChart(
  s: Source,
  ownerMemberId: string,
  currency: string,
  kind: 'personal' | 'group',
): OracleChart {
  const expenses = s.expenses!.filter((e) => e.currency_code === currency);
  const unit = Math.max(0, ...expenses.map((e) => Number(e.minor_unit)));
  const amounts = new Map<string | null, ExactAmount>();
  for (const e of expenses) {
    const ids = new Set(s.shares!.filter((sh) => sh.expense_id === e.id).map((sh) => sh.member_id));
    if (kind === 'personal' ? !ids.has(ownerMemberId) : ids.size < 2) continue;
    const amount = fraction(
      BigInt(String(e.amount_minor)) * 10n ** BigInt(unit - Number(e.minor_unit)),
      kind === 'personal' ? BigInt(ids.size) : 1n,
      unit,
    );
    const key = e.category_id as string | null;
    amounts.set(key, add(amounts.get(key) ?? fraction(0n, 1n, unit), amount));
  }
  const categories = [...amounts]
    .filter(([, a]) => BigInt(a.numerator) > 0n)
    .sort(([a], [b]) => (a === null ? -1 : b === null ? 1 : a < b ? -1 : a > b ? 1 : 0))
    .map(([id, amount]) => ({
      category:
        id === null ? null : { id, name: String(s.categories!.find((c) => c.id === id)!.name) },
      amount,
    }));

  return {
    categories,
    total: categories.reduce((sum, c) => add(sum, c.amount), fraction(0n, 1n, unit)),
  };
}

export function exactEqual(a: ExactAmount, b: ExactAmount) {
  return (
    BigInt(a.numerator) * BigInt(b.denominator) * 10n ** BigInt(b.minorUnit) ===
    BigInt(b.numerator) * BigInt(a.denominator) * 10n ** BigInt(a.minorUnit)
  );
}

export function largeAmount(text: string): ExactAmount {
  if (text.includes('/')) {
    const [n, d] = text.split('/');

    return fraction(BigInt(n!), BigInt(d!));
  }
  const [n, d = ''] = text.split('.');

  return fraction(BigInt(n! + d), 10n ** BigInt(d.length));
}

export function checkedReply(world: LedgerWorld): {
  tripId: string;
  ownerMemberId: string;
  hasSharedExpenses: boolean;
  currencies: OracleCurrency[];
} {
  expect(world.response!.status()).toBe(200);
  expect(world.get('analysis:after')).toEqual(world.get('analysis:before'));
  const body = world.get<{
    tripId: string;
    ownerMemberId: string;
    hasSharedExpenses: boolean;
    currencies: OracleCurrency[];
  }>('analysis:reply');
  const c = analysisContext(world);
  expect(body.tripId).toBe(c.tripId);
  expect(body.ownerMemberId).toBe(c.ownerMemberId);
  const source = world.get<Source>('analysis:before');
  for (const row of body.currencies) {
    expect(row.minorUnit).toBe(
      Math.max(
        ...source
          .expenses!.filter((e) => e.currency_code === row.currencyCode)
          .map((e) => Number(e.minor_unit)),
      ),
    );
    for (const chart of [row.personal, row.group])
      for (const amount of [chart.total, ...chart.categories.map((c) => c.amount)])
        expect(amount.minorUnit).toBe(row.minorUnit);
  }

  return body;
}

export function assertAnalysisCategories(
  world: LedgerWorld,
  kind: string,
  currency: string,
  rows: Record<string, string>[],
) {
  const body = checkedReply(world),
    c = analysisContext(world);
  const group = body.currencies.find((c) => c.currencyCode === currency);
  expect(group).toBeTruthy();
  const chart = kind === '個人' ? 'personal' : 'group';
  const expected = expectedChart(
    world.get<Source>('analysis:before'),
    c.ownerMemberId!,
    currency,
    chart,
  );
  expect(group![chart]).toEqual(expected);
  expect(expected.categories.map((c) => c.category?.name ?? '未分類').sort()).toEqual(
    rows.map((r) => r.分類).sort(),
  );
  for (const row of rows)
    expect(
      exactEqual(
        expected.categories.find((c) => (c.category?.name ?? '未分類') === row.分類)!.amount,
        largeAmount(row.金額!),
      ),
    ).toBe(true);
}

export function assertAnalysisTotals(world: LedgerWorld, rows: Record<string, string>[]) {
  const b = checkedReply(world),
    s = world.get<Source>('analysis:before'),
    owner = analysisContext(world).ownerMemberId!;
  const codes = [...new Set(s.expenses!.map((e) => String(e.currency_code)))].sort();
  expect(b.currencies.map((c) => c.currencyCode)).toEqual(codes);
  expect(rows.map((r) => r.幣別).sort()).toEqual(codes);
  for (const currency of b.currencies)
    for (const [kind, column] of [
      ['personal', '個人'],
      ['group', '團體'],
    ] as const) {
      const expected = expectedChart(s, owner, currency.currencyCode, kind);
      expect(currency[kind]).toEqual(expected);
      expect(
        exactEqual(
          expected.total,
          largeAmount(rows.find((r) => r.幣別 === currency.currencyCode)![column]!),
        ),
      ).toBe(true);
    }
}

export function assertAnalysisCurrencies(world: LedgerWorld, list: string) {
  const b = checkedReply(world),
    s = world.get<Source>('analysis:before');
  expect(b.currencies.map((c) => c.currencyCode)).toEqual(list.split('、'));
  expect(b.currencies.map((c) => c.currencyCode)).toEqual(
    [...new Set(s.expenses!.map((e) => e.currency_code))].sort(),
  );
}

export function assertAnalysisZero(world: LedgerWorld, kind: string, currency: string) {
  const b = checkedReply(world),
    s = world.get<Source>('analysis:before'),
    owner = analysisContext(world).ownerMemberId!;
  expect(s.expenses!.some((e) => e.currency_code === currency)).toBe(true);
  const row = b.currencies.find((c) => c.currencyCode === currency)!;
  expect(row).toBeTruthy();
  const chart = kind === '個人' ? 'personal' : 'group';
  expect(row[chart]).toEqual(expectedChart(s, owner, currency, chart));
  expect(row[chart].categories).toEqual([]);
  expect(row[chart].total).toEqual({ numerator: '0', denominator: '1', minorUnit: row.minorUnit });
}

export function assertAnalysisShared(world: LedgerWorld, state: string) {
  const b = checkedReply(world),
    s = world.get<Source>('analysis:before');
  const has = s.expenses!.some(
    (e) =>
      new Set(s.shares!.filter((sh) => sh.expense_id === e.id).map((sh) => sh.member_id)).size >= 2,
  );
  expect(b.hasSharedExpenses).toBe(has);
  expect(b.hasSharedExpenses).toBe(state === '有');
}

export function assertAnalysisEmpty(world: LedgerWorld) {
  const b = checkedReply(world),
    s = world.get<Source>('analysis:before');
  expect(s.expenses).toEqual([]);
  expect(s.trips).toHaveLength(1);
  expect(s.trips![0]!.deleted_at).toBeNull();
  expect(b.currencies).toEqual([]);
  expect(b.hasSharedExpenses).toBe(false);
}

export function assertAnalysisPrecision(world: LedgerWorld, currency: string, unit: number) {
  const b = checkedReply(world),
    s = world.get<Source>('analysis:before');
  expect(
    Math.max(
      ...s.expenses!.filter((e) => e.currency_code === currency).map((e) => Number(e.minor_unit)),
    ),
  ).toBe(unit);
  const row = b.currencies.find((c) => c.currencyCode === currency)!;
  expect(row.minorUnit).toBe(unit);
  for (const chart of [row.personal, row.group])
    for (const amount of [chart.total, ...chart.categories.map((c) => c.amount)])
      expect(amount.minorUnit).toBe(unit);
}

export function assertAnalysisReadOnly(world: LedgerWorld) {
  const b = checkedReply(world),
    s = world.get<Source>('analysis:before'),
    c = analysisContext(world);
  expect(world.get('analysis:after')).toEqual(s);
  expect(b.currencies.map((c) => c.currencyCode)).toEqual(
    [...new Set(s.expenses!.map((e) => String(e.currency_code)))].sort(),
  );
  for (const row of b.currencies)
    for (const kind of ['personal', 'group'] as const)
      expect(row[kind]).toEqual(expectedChart(s, c.ownerMemberId!, row.currencyCode, kind));
}

export function assertAnalysisOwner(world: LedgerWorld) {
  const b = checkedReply(world),
    s = world.get<Source>('analysis:before');
  const owners = s.members!.filter((m) => m.role === 'owner');
  expect(owners).toHaveLength(1);
  expect(b.ownerMemberId).toBe(owners[0]!.id);
  expect(b.ownerMemberId).not.toBe(world.users.get('Alice')!.id);
  for (const row of b.currencies)
    expect(row.personal).toEqual(expectedChart(s, b.ownerMemberId, row.currencyCode, 'personal'));
}

export function assertAnalysisHistoricalShares(world: LedgerWorld, item: string) {
  assertAnalysisReadOnly(world);
  const c = analysisContext(world),
    s = world.get<Source>('analysis:before');
  expect(
    s
      .shares!.filter((sh) => sh.expense_id === c.expenses.get(item))
      .map((sh) => sh.member_id)
      .sort(),
  ).toEqual(['Alice', 'Amy', 'Bob'].map((n) => c.members.get(n)).sort());
  const amy = s.members!.find((m) => m.id === c.members.get('Amy'))!;
  expect(amy.is_active).toBe(false);
  expect(amy.name).not.toBe('Amy');
}

export function assertAnalysisDenied(world: LedgerWorld, reason: string) {
  const [status, code] =
    reason === '未登入'
      ? [401, 'UNAUTHENTICATED']
      : reason === '垃圾桶'
        ? [409, 'TRIP_TRASHED']
        : [404, 'NOT_FOUND'];
  expect(world.response!.status()).toBe(status);
  const body = world.get<Record<string, unknown>>('analysis:reply');
  expect(body.code).toBe(code);
  expect(Object.keys(body).sort()).toEqual(['code', 'message']);
  expect(world.get('analysis:after')).toEqual(world.get('analysis:before'));
  expect(world.get('analysis:authAfter')).toEqual(world.get('analysis:authBefore'));
  const source = world.get<Source>('analysis:before'),
    viewer = world.get<string | null>('analysis:viewer');
  if (reason === '未登入') expect(viewer).toBeNull();
  else if (reason === '垃圾桶') {
    expect(viewer).toBe('Alice');
    expect(source.trips![0]!.deleted_at).not.toBeNull();
  } else expect(source.trips!.length === 0 || viewer !== 'Alice').toBe(true);
}

import { test, expect } from 'vitest';
import * as product from '../../src/modules/expenses/analysis/service.js';

const aggregate = () => {
  const fn = Reflect.get(product, 'aggregateAnalysis');
  expect(fn, 'Product must provide the exact analysis aggregator').toBeTypeOf('function');

  return fn as (
    rows: unknown[],
    owner: string,
  ) => {
    currencies: {
      minorUnit: number;
      personal: { total: { numerator: string; denominator: string; minorUnit: number } };
      group: { total: { numerator: string; denominator: string; minorUnit: number } };
    }[];
  };
};
test('T024 circular shares accumulate exactly, beyond Number safe integers', () => {
  const run = aggregate();
  const source = Array.from({ length: 3 }, () => ({
    currencyCode: 'JPY',
    minorUnit: 0,
    amountMinor: 100n,
    shareMemberIds: ['owner', 'amy', 'bob'],
    category: { id: 'food', name: '餐飲' },
  }));
  expect(run(source, 'owner').currencies[0]!.personal.total).toEqual({
    numerator: '100',
    denominator: '1',
    minorUnit: 0,
  });
  const huge = 10n ** 400n + 9007199254740993n;
  expect(
    run([{ ...source[0], amountMinor: huge, shareMemberIds: ['owner'] }], 'owner').currencies[0]!
      .personal.total.numerator,
  ).toBe(String(huge));
});
test('T024 historical scales include non-owner sources and preserve rational amounts', () => {
  const run = aggregate();
  const source = [
    {
      currencyCode: 'TWD',
      minorUnit: 2,
      amountMinor: 101n,
      shareMemberIds: ['owner', 'amy'],
      category: null,
    },
    {
      currencyCode: 'TWD',
      minorUnit: 3,
      amountMinor: 1n,
      shareMemberIds: ['owner', 'amy'],
      category: null,
    },
    { currencyCode: 'TWD', minorUnit: 4, amountMinor: 1n, shareMemberIds: ['bob'], category: null },
  ];
  const c = run(source, 'owner').currencies[0]!;
  expect(c.minorUnit).toBe(4);
  expect(c.personal.total).toEqual({ numerator: '5055', denominator: '1', minorUnit: 4 });
  expect(c.group.total).toEqual({ numerator: '10110', denominator: '1', minorUnit: 4 });
});

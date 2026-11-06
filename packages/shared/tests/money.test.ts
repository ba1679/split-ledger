import { describe, expect, test } from 'vitest';
import { parseMoney, formatMoney, rescaleMoney, combineMoney } from '../src/index.js';

describe('exact monetary values', () => {
  test('parses ISO precision and TWD integer input without floating point', () => {
    expect(parseMoney('8000', 2, 'TWD')).toBe(800000n);
    expect(parseMoney('12.50', 2, 'USD')).toBe(1250n);
    expect(parseMoney('0.0001', 4, 'CLF')).toBe(1n);
    expect(parseMoney('92233720368547758.07', 2, 'USD')).toBe(9223372036854775807n);
    expect(formatMoney(9007199254740993n, 2)).toBe('90071992547409.93');
    expect(formatMoney(1n, 4)).toBe('0.0001');
  });
  test.each([
    '-1',
    '+1',
    '0',
    '0.00',
    '01',
    '1e2',
    '1,000',
    ' 1',
    '1 ',
    '.5',
    '1.',
    'NaN',
    '92233720368547758.08',
  ])('rejects invalid or overflowing input %s', (amount) => {
    expect(() => parseMoney(amount, 2, 'USD')).toThrow(RangeError);
  });
  test('refuses precision loss and any explicit TWD decimal', () => {
    expect(() => parseMoney('100.0', 0, 'JPY')).toThrow();
    expect(() => parseMoney('100.00', 2, 'TWD')).toThrow();
    expect(() => parseMoney('12.501', 2, 'USD')).toThrow();
    expect(() => rescaleMoney(123n, 1, 0)).toThrow();
    expect(rescaleMoney(1200n, 2, 0)).toBe(12n);
    expect(rescaleMoney(123n, 1, 2)).toBe(1230n);
    expect(() => rescaleMoney(9223372036854775807n, 0, 1)).toThrow();
  });

  test('normalizes historical scales and allows total sums beyond BIGINT', () => {
    expect(
      combineMoney([
        { currencyCode: 'USD', minorUnit: 1, amountMinor: 123n },
        { currencyCode: 'USD', minorUnit: 2, amountMinor: 123n },
        { currencyCode: 'JPY', minorUnit: 0, amountMinor: 9223372036854775807n },
        { currencyCode: 'JPY', minorUnit: 0, amountMinor: 9223372036854775807n },
      ]),
    ).toEqual([
      { currencyCode: 'JPY', minorUnit: 0, amount: '18446744073709551614' },
      { currencyCode: 'USD', minorUnit: 2, amount: '13.53' },
    ]);
  });
});

import { test, expect } from 'vitest';
import { formatShareAmount } from '../../src/features/expenses/ExpenseShares.js';

test('T080 exact formatter rounds only presentation, with no Number conversion', () => {
  expect(formatShareAmount({ numerator: '1005', denominator: '1', minorUnit: 3 })).toBe('1.01');
  expect(formatShareAmount({ numerator: '100', denominator: '3', minorUnit: 0 })).toBe('33.33');
  expect(formatShareAmount({ numerator: '1011', denominator: '2', minorUnit: 3 })).toBe('0.51');
  expect(formatShareAmount({ numerator: '125', denominator: '1', minorUnit: 2 })).toBe('1.25');
  expect(
    formatShareAmount({ numerator: '900719925474099312345', denominator: '1', minorUnit: 2 }),
  ).toBe('9007199254740993123.45');
  const huge = '1' + '0'.repeat(400);
  expect(formatShareAmount({ numerator: huge, denominator: '1', minorUnit: 0 })).toBe(huge);
});

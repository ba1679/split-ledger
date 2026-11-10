import { test, expect } from 'vitest';
import { classifyArrangementPayment, prefillArrangementPayment } from '../src/index.js';

test('payable shortfalls stay partial while existing sub-unit tails and overpayments can close', () => {
  expect(
    classifyArrangementPayment({ numerator: '15000', denominator: '1', minorUnit: 0 }, 2000n, 0),
  ).toEqual({
    partial: true,
    remainingAmount: { numerator: '13000', denominator: '1', minorUnit: 0 },
  });
  expect(
    classifyArrangementPayment({ numerator: '100', denominator: '3', minorUnit: 0 }, 33n, 0),
  ).toEqual({
    partial: false,
    remainingAmount: { numerator: '1', denominator: '3', minorUnit: 0 },
  });
  expect(
    classifyArrangementPayment({ numerator: '100', denominator: '3', minorUnit: 2 }, 33n, 2)
      .partial,
  ).toBe(false);
  expect(
    classifyArrangementPayment({ numerator: '15000', denominator: '1', minorUnit: 0 }, 14999n, 0)
      .partial,
  ).toBe(true);
  expect(
    classifyArrangementPayment({ numerator: '600', denominator: '1', minorUnit: 0 }, 700n, 0)
      .partial,
  ).toBe(false);
});

test('prefill uses current legal cash precision, preserving an editable payable amount', () => {
  expect(
    prefillArrangementPayment({ numerator: '15000', denominator: '1', minorUnit: 0 }, 0, 'KRW'),
  ).toBe('15000');
  expect(
    prefillArrangementPayment({ numerator: '100', denominator: '3', minorUnit: 0 }, 0, 'JPY'),
  ).toBe('33');
  expect(
    prefillArrangementPayment({ numerator: '1', denominator: '3', minorUnit: 0 }, 0, 'JPY'),
  ).toBe('1');
  expect(
    prefillArrangementPayment({ numerator: '10000', denominator: '3', minorUnit: 2 }, 2, 'USD'),
  ).toBe('33.33');
  expect(
    prefillArrangementPayment({ numerator: '10000', denominator: '3', minorUnit: 2 }, 2, 'TWD'),
  ).toBe('34');
  expect(
    prefillArrangementPayment({ numerator: '1', denominator: '1', minorUnit: 4 }, 4, 'CLF'),
  ).toBe('0.0001');
});

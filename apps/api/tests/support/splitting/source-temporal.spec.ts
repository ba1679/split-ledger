import { test, expect } from '../fixtures.js';
import { sourceDateOnly, sourceTimestamp } from './source-temporal.js';

test('SQL DATE retains January and July calendar fields in the process timezone', () => {
  expect(sourceDateOnly(new Date(2027, 0, 20))).toBe('2027-01-20');
  expect(sourceDateOnly(new Date(2027, 6, 20))).toBe('2027-07-20');
  expect(sourceDateOnly('2027-01-20')).toBe('2027-01-20');
});

test('SQL timestamp preserves subsecond precision for parsed Date and ISO string', () => {
  const instant = '2027-01-20T12:00:00.147Z';
  expect(sourceTimestamp(new Date(instant))).toBe(instant);
  expect(sourceTimestamp(instant)).toBe(instant);
});

import { test, expect } from 'vitest';

const modules = import.meta.glob('../../src/features/expenses/analysis/*.ts', { eager: true });

function format() {
  const module = modules['../../src/features/expenses/analysis/math.ts'] ?? {};
  const fn = Reflect.get(module as object, 'formatAnalysisPercent');
  expect(fn, 'Product must expose the exact percentage formatter').toBeTypeOf('function');

  return fn as (a: object, t: object) => string | null;
}

const a = (numerator: string, denominator = '1', minorUnit = 0) => ({
  numerator,
  denominator,
  minorUnit,
});
test('T084 percentages round half up, strip zeros, retain tiny positive amounts and reject zero totals', () => {
  const f = format();
  expect(f(a('1'), a('32'))).toBe('3.13%');
  expect(f(a('1'), a('3'))).toBe('33.33%');
  expect(f(a('1'), a('8'))).toBe('12.5%');
  expect(f(a('1'), a('100000'))).toBe('小於0.01%');
  expect(f(a('1'), a('10000'))).toBe('0.01%');
  expect(f(a('1'), a('0'))).toBeNull();
  const huge = 10n ** 400n;
  expect(f(a(String(huge)), a(String(huge * 3n)))).toBe('33.33%');
  expect(f(a('50', '1', 2), a('1000', '1', 3))).toBe('50%');
});

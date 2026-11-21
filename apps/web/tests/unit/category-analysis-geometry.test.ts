import { test, expect } from 'vitest';

const modules = import.meta.glob('../../src/features/expenses/analysis/*.ts', { eager: true });
const a = (numerator: string, denominator = '1', minorUnit = 0) => ({
  numerator,
  denominator,
  minorUnit,
});

function weights() {
  const module = modules['../../src/features/expenses/analysis/math.ts'] ?? {};
  const fn = Reflect.get(module as object, 'chartWeights');
  expect(fn, 'Product must provide bounded cumulative chart weights').toBeTypeOf('function');

  return fn as (amounts: object[]) => number[];
}

test('T086 cumulative thirds close exactly at 10^12 without per-row rounded percentages', () => {
  expect(weights()([a('100', '3'), a('100', '3'), a('100', '3')])).toEqual([
    333333333333, 333333333333, 333333333334,
  ]);
});
test('T086 giant and tiny weights remain finite and nonnegative', () => {
  const run = weights(),
    huge = '1' + '0'.repeat(400);
  for (const values of [
    [a('1'), a(huge)],
    [a(huge), a(huge)],
    [a('101', '1', 2), a('1', '1', 3)],
  ]) {
    const valuesOut = run(values);
    expect(valuesOut).toHaveLength(values.length);
    expect(valuesOut.every((x) => Number.isFinite(x) && x >= 0 && x <= 1e12)).toBe(true);
    expect(valuesOut.reduce((a, b) => a + b, 0)).toBe(1e12);
  }
  expect(run([a('1'), a('1' + '0'.repeat(30))])).toEqual([0, 1e12]);
});
test('T086 zero totals have no consumption geometry', () => {
  expect(weights()([a('0'), a('0')])).toEqual([0, 0]);
  expect(weights()([])).toEqual([]);
});

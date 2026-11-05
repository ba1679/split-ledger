export const MAX_AMOUNT_MINOR = 9223372036854775807n;
function checkUnit(minorUnit: number) {
  if (!Number.isInteger(minorUnit) || minorUnit < 0 || minorUnit > 4) throw new RangeError('Invalid currency precision');
}
function boundedAmount(value: bigint) {
  if (value < 1n || value > MAX_AMOUNT_MINOR) throw new RangeError('Amount is outside the positive BIGINT range');
  return value;
}
/** Strict user input; all arithmetic remains in integer minor units. */
export function parseMoney(amount: string, minorUnit: number, currencyCode?: string): bigint {
  checkUnit(minorUnit);
  if (amount.length > 25 || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(amount)) throw new RangeError('Invalid decimal amount');
  const [whole = '', fraction = ''] = amount.split('.');
  if ((currencyCode === 'TWD' && amount.includes('.')) || fraction.length > minorUnit) throw new RangeError('Amount has invalid precision');
  return boundedAmount(BigInt(whole) * 10n ** BigInt(minorUnit) + BigInt(fraction.padEnd(minorUnit, '0') || '0'));
}
/** Canonical fixed-scale output, including totals larger than one stored amount. */
export function formatMoney(value: bigint, minorUnit: number): string {
  checkUnit(minorUnit);
  if (value < 0n) throw new RangeError('Negative money is unsupported');
  const digits = value.toString().padStart(minorUnit + 1, '0');
  return minorUnit ? `${digits.slice(0, -minorUnit)}.${digits.slice(-minorUnit)}` : digits;
}
/** Preserve a historical major-unit value exactly when its currency changes. */
export function rescaleMoney(value: bigint, fromUnit: number, toUnit: number): bigint {
  checkUnit(fromUnit); checkUnit(toUnit);
  if (toUnit >= fromUnit) return boundedAmount(value * 10n ** BigInt(toUnit - fromUnit));
  const divisor = 10n ** BigInt(fromUnit - toUnit);
  if (value % divisor !== 0n) throw new RangeError('Currency change would discard precision');
  return boundedAmount(value / divisor);
}
export function combineMoney(rows: readonly { currencyCode: string; minorUnit: number; amountMinor: bigint }[]) {
  const groups = new Map<string, { unit: number; amount: bigint }>();
  for (const row of rows) {
    checkUnit(row.minorUnit);
    const prior = groups.get(row.currencyCode) ?? { unit: row.minorUnit, amount: 0n };
    const unit = Math.max(prior.unit, row.minorUnit);
    groups.set(row.currencyCode, { unit, amount: prior.amount * 10n ** BigInt(unit - prior.unit) + row.amountMinor * 10n ** BigInt(unit - row.minorUnit) });
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([currencyCode, row]) => ({ currencyCode, minorUnit: row.unit, amount: formatMoney(row.amount, row.unit) }));
}

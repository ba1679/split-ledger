export function calendarDate(year: number, month: number, day: number) {
  const date = new Date(0);

  date.setUTCFullYear(year, month, day);
  date.setUTCHours(12, 0, 0, 0);

  return date;
}

export function dateOnly(date: Date) {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function localToday() {
  const now = new Date();

  return calendarDate(now.getFullYear(), now.getMonth(), now.getDate());
}

export function parseDate(value: string): Date | null {
  const match = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(value.trim());

  if (!match) return null;

  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);

  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const result = calendarDate(year, month - 1, day);

  return result.getUTCFullYear() === year &&
    result.getUTCMonth() === month - 1 &&
    result.getUTCDate() === day
    ? result
    : null;
}

export function shiftMonth(date: Date, amount: number) {
  const first = calendarDate(date.getUTCFullYear(), date.getUTCMonth() + amount, 1);

  return calendarDate(
    first.getUTCFullYear(),
    first.getUTCMonth(),
    Math.min(
      date.getUTCDate(),
      calendarDate(first.getUTCFullYear(), first.getUTCMonth() + 1, 0).getUTCDate(),
    ),
  );
}

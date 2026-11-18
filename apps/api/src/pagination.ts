import { createHmac, timingSafeEqual } from 'node:crypto';
import { invalid } from './http.js';

export function tripPageLimit(value: string | undefined): number {
  const limit = value === undefined ? 50 : Number(value);

  if (!Number.isSafeInteger(limit) || limit > 100) throw invalid('每頁筆數須為 1 到 100 的整數。');

  return limit;
}

interface TripCursor {
  owner: string;
  scope: 'trips' | 'trips-trash';
  time: string;
  id: string;
}

export function encodeTripCursor(value: TripCursor, secret: string) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');

  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}

export function decodeTripCursor(
  value: string,
  owner: string,
  secret: string,
  scope: TripCursor['scope'] = 'trips',
): TripCursor {
  try {
    const parts = value.split('.');

    if (parts.length !== 2) throw Error();

    const [payload, signature] = parts as [string, string];
    const expected = createHmac('sha256', secret).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Error();

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TripCursor;

    if (
      parsed.owner !== owner ||
      parsed.scope !== scope ||
      typeof parsed.time !== 'string' ||
      !Number.isFinite(Date.parse(parsed.time)) ||
      !/^[0-9a-f-]{36}$/i.test(parsed.id)
    )
      throw Error();

    return parsed;
  } catch {
    throw invalid('分頁資訊不正確，請重新載入旅行清單。');
  }
}
interface ExpenseCursor {
  owner: string;
  scope: 'expenses';
  tripId: string;
  spentOn: string;
  id: string;
}

export function encodeExpenseCursor(value: ExpenseCursor, secret: string) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');

  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}

export function decodeExpenseCursor(
  value: string,
  owner: string,
  tripId: string,
  secret: string,
): ExpenseCursor {
  try {
    const parts = value.split('.');

    if (parts.length !== 2) throw Error();

    const [payload, signature] = parts as [string, string];
    const expected = createHmac('sha256', secret).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Error();

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as ExpenseCursor;

    if (
      parsed.owner !== owner ||
      parsed.scope !== 'expenses' ||
      parsed.tripId !== tripId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(parsed.spentOn) ||
      !/^[0-9a-f-]{36}$/i.test(parsed.id)
    )
      throw Error();

    return parsed;
  } catch {
    throw invalid('分頁資訊不正確，請重新載入支出清單。');
  }
}

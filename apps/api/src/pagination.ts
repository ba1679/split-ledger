import { createHmac, timingSafeEqual } from 'node:crypto';
import { invalid } from './http.js';

interface TripCursor { owner: string; scope: 'trips'; time: string; id: string }
export function encodeTripCursor(value: TripCursor, secret: string) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
export function decodeTripCursor(value: string, owner: string, secret: string): TripCursor {
  try {
    const parts = value.split('.');
    if (parts.length !== 2) throw Error();
    const [payload, signature] = parts as [string, string];
    const expected = createHmac('sha256', secret).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Error();
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TripCursor;
    if (parsed.owner !== owner || parsed.scope !== 'trips' || typeof parsed.time !== 'string' || !Number.isFinite(Date.parse(parsed.time)) || !/^[0-9a-f-]{36}$/i.test(parsed.id)) throw Error();
    return parsed;
  } catch { throw invalid('分頁資訊不正確，請重新載入旅行清單。'); }
}

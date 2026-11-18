import { expect, type Request } from '@playwright/test';

/** WebKit may report transport completion for headers followed by one truncated JSON byte. */
export async function assertFailedJsonRead(request: Request, original: Buffer): Promise<void> {
  // The caller has observed requestfinished/requestfailed. Chromium can leave
  // Response.finished pending after a truncated response has already failed.
  if (request.failure() !== null) return;
  const response = await request.response();
  expect(response?.status()).toBe(200);
  const body = await response!.body();
  expect(body).toEqual(original.subarray(0, 1));
  expect(Number(response!.headers()['content-length'])).toBeGreaterThan(body.length);
  await expect(response!.json()).rejects.toThrow();
}

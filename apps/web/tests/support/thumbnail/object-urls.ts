import { expect, type Page } from '@playwright/test';

export interface ObjectUrlRecord {
  url: string;
  name: string | null;
  size: number;
  type: string;
  revoked: boolean;
}

type BrowserTracker = { records: ObjectUrlRecord[]; restore(): void };
type TrackedWindow = Window & { ledgerTestUrls?: BrowserTracker };

/** Observe genuine native Blob URL creation/revocation; never replace bytes or decoding. */
export async function observeObjectUrls(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as TrackedWindow;
    if (target.ledgerTestUrls) return;
    const create = URL.createObjectURL,
      revoke = URL.revokeObjectURL;
    const records: ObjectUrlRecord[] = [];
    const wrappedCreate: typeof URL.createObjectURL = (blob) => {
      const url = create.call(URL, blob);
      if (blob instanceof Blob)
        records.push({
          url,
          name: blob instanceof File ? blob.name : null,
          size: blob.size,
          type: blob.type,
          revoked: false,
        });

      return url;
    };
    const wrappedRevoke: typeof URL.revokeObjectURL = (url) => {
      revoke.call(URL, url);
      for (const record of records) if (record.url === url) record.revoked = true;
    };
    URL.createObjectURL = wrappedCreate;
    URL.revokeObjectURL = wrappedRevoke;
    target.ledgerTestUrls = {
      records,
      restore() {
        if (URL.createObjectURL === wrappedCreate) URL.createObjectURL = create;
        if (URL.revokeObjectURL === wrappedRevoke) URL.revokeObjectURL = revoke;
        delete target.ledgerTestUrls;
      },
    };
  });
}

export async function objectUrls(page: Page): Promise<ObjectUrlRecord[]> {
  return page.evaluate(() => (window as TrackedWindow).ledgerTestUrls?.records ?? []);
}

export async function restoreObjectUrls(page: Page): Promise<void> {
  if (!page.isClosed())
    await page.evaluate(() => (window as TrackedWindow).ledgerTestUrls?.restore());
}

export async function assertDraftUrlsReleased(page: Page): Promise<void> {
  await expect
    .poll(async () => (await objectUrls(page)).every((record) => record.revoked), {
      message: 'Unmounted preview effects must release native object URLs',
    })
    .toBe(true);
  const records = await objectUrls(page);
  for (const record of records) {
    expect(record.revoked, `Abandoned preview URL must be revoked: ${record.name}`).toBe(true);
    expect(
      await page.evaluate(async (url) => {
        try {
          await fetch(url);

          return true;
        } catch {
          return false;
        }
      }, record.url),
    ).toBe(false);
  }
}

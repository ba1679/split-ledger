import { expect, type Page } from '@playwright/test';

/** Wait for the native event consumed by Query's online manager; never spoof navigator. */
export async function disconnectLoadedPage(page: Page): Promise<void> {
  let observed = false;
  await page.exposeFunction('ledgerObserveOffline', () => {
    observed = true;
  });
  await page.evaluate(() => {
    window.addEventListener(
      'offline',
      () => {
        void (
          window as unknown as { ledgerObserveOffline(): Promise<void> }
        ).ledgerObserveOffline();
      },
      { once: true },
    );
  });
  await page.context().setOffline(true);
  await expect.poll(() => observed).toBe(true);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
}

export async function openOfflineTrips(page: Page): Promise<void> {
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  await page.getByRole('link', { name: '我的旅行', exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/trips$/);
}

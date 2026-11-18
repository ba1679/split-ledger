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
  const mobile = page.getByRole('navigation', { name: '行動導覽', exact: true });
  if (await mobile.isVisible()) {
    await mobile.getByRole('button', { name: '我的旅行', exact: true }).click();
    await page
      .getByRole('dialog', { name: '我的旅行', exact: true })
      .getByRole('link', { name: '旅行清單', exact: true })
      .click();
  } else {
    await page
      .getByRole('navigation', { name: '主要導覽', exact: true })
      .getByRole('link', { name: '我的旅行', exact: true })
      .click();
  }
  await expect(page).toHaveURL(/\/trips$/);
}

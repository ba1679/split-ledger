import { expect, type Page } from '@playwright/test';
import { waitForManagementReads, type ManagementUI } from './management-fixture.js';

/** Read-only history navigation checks even brief exposure of a cached ordinary ledger. */
export async function assertNoCachedLedgerOnBack(page: Page, ui: ManagementUI, tripId: string) {
  const href = `/trips/${tripId}/expenses/new`;
  await page.evaluate((target) => {
    const state = window as unknown as {
      tripTestObserver: MutationObserver;
      tripTestExposed: boolean;
    };
    state.tripTestExposed = false;
    state.tripTestObserver = new MutationObserver(() => {
      if ([...document.querySelectorAll('a')].some((link) => link.getAttribute('href') === target))
        state.tripTestExposed = true;
    });
    state.tripTestObserver.observe(document.body, { childList: true, subtree: true });
  }, href);
  try {
    await page.goBack();
    await waitForManagementReads(ui);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(page.getByRole('link', { name: '記一筆', exact: true })).toBeHidden();
    expect(
      await page.evaluate(() =>
        Boolean((window as unknown as { tripTestExposed?: boolean }).tripTestExposed),
      ),
    ).toBe(false);
  } finally {
    await page.evaluate(() =>
      (window as unknown as { tripTestObserver?: MutationObserver }).tripTestObserver?.disconnect(),
    );
  }
  await page.goForward();
  await expect(page).toHaveURL(/\/trips$/);
  await waitForManagementReads(ui);
}

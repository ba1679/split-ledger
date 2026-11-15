import { When, expect } from '../../../support/fixtures.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';

When('owner 開啟原旅行舊連結', async ({ world }) => {
  const { page } = managementUI(world);
  const { tripId, path } = world.get<{ tripId: string; path: string }>('management:staleLink');
  // Observe the same SPA/cache rather than destroying it with a full reload.
  await page.evaluate(
    ({ tripPath }) => {
      const target = window as unknown as {
        staleLedgerObserver?: MutationObserver;
        staleLedgerExposed?: boolean;
      };
      target.staleLedgerExposed = false;
      target.staleLedgerObserver = new MutationObserver(() => {
        if (location.pathname !== tripPath) return;
        const visible = (element: Element) => element.getClientRects().length > 0;
        const writable = [...document.querySelectorAll('a')].some(
          (element) =>
            element.getAttribute('href') === `${tripPath}/expenses/new` && visible(element),
        );
        const ledger = [...document.querySelectorAll('[role="region"]')].some(
          (element) => element.getAttribute('aria-label') === '成員淨額' && visible(element),
        );
        if (writable || ledger) target.staleLedgerExposed = true;
      });
      target.staleLedgerObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    },
    { tripPath: path },
  );
  world.tripManagement.cleanups.add(async () => {
    if (!page.isClosed())
      await page.evaluate(() =>
        (
          window as unknown as { staleLedgerObserver?: MutationObserver }
        ).staleLedgerObserver?.disconnect(),
      );
  });
  const authoritative = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      [`/api/trips/${tripId}`, `/api/trips/${tripId}/state`].includes(
        new URL(response.url()).pathname,
      ),
  );
  const back = page
    .getByRole('link')
    .filter({ hasText: /日本旅行|返回旅行帳本/ })
    .and(page.locator(`a[href="${path}"]`));
  await expect(back).toHaveCount(1);
  await back.click();
  const response = await authoritative;
  expect([200, 404, 409]).toContain(response.status());
  expect(await response.finished()).toBeNull();
  world.set('management:staleLinkResponse', {
    status: response.status(),
    body: await response.json(),
  });
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await waitForManagementReads(managementUI(world));
  expect(managementUI(world).writes.length).toBe(0);
});

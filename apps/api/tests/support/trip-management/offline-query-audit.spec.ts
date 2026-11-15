import type { Request } from '@playwright/test';
import { test, expect } from '../../../../web/tests/support/fixtures.js';
import { seedTrip, seedCategory } from '../seed.js';
import { login } from '../../../../web/tests/support/browser.js';
import {
  disconnectLoadedPage,
  openOfflineTrips,
} from '../../../../web/tests/support/loading/offline-network.js';

test('native offline SPA navigation pauses the uncached trip query and reconnect resumes the original page', async ({
  page,
  world,
}) => {
  await seedTrip(world, '離線同頁查詢');
  await seedCategory(world, '餐飲');
  await login(page, world);
  const trips: Request[] = [],
    documents: string[] = [];
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documents.push(request.url());
    if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/trips')
      trips.push(request);
  });
  await page.goto('/categories');
  await expect(page.getByText('餐飲', { exact: true })).toBeVisible();
  expect(trips.length).toBe(0);
  await disconnectLoadedPage(page);
  await openOfflineTrips(page);
  expect(trips.length).toBe(0);
  await expect(page.getByRole('heading', { name: '離線同頁查詢', exact: true })).toHaveCount(0);
  const loadedDocuments = [...documents];
  await page.context().setOffline(false);
  await expect(page.getByRole('heading', { name: '離線同頁查詢', exact: true })).toBeVisible();
  expect(trips.length).toBe(1);
  expect((await trips[0]!.response())?.status()).toBe(200);
  expect(await (await trips[0]!.response())!.finished()).toBeNull();
  expect(documents).toEqual(loadedDocuments);
});

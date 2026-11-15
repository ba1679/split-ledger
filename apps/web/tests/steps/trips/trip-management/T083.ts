import { When, expect } from '../../../support/fixtures.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';

When('owner 開啟 {string}', async ({ world }, scope: string) => {
  expect(['一般清單', '垃圾桶']).toContain(scope);
  expect(world.get('management:emptyList')).toBe(scope);
  const { page } = managementUI(world);
  const path = scope === '一般清單' ? '/trips' : '/trips/trash';
  const [response] = await Promise.all([
    page.waitForResponse(
      (result) =>
        result.request().method() === 'GET' && new URL(result.url()).pathname === `/api${path}`,
    ),
    page.goto(path),
  ]);

  expect(await response.finished()).toBeNull();
  world.set('management:emptyResponse', response);
  await waitForManagementReads(managementUI(world));
});

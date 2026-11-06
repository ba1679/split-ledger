import { test, expect } from '../../apps/web/tests/support/fixtures.js';

test('worker browser reaches real Vite and API proxy', async ({ page, world }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('旅行記帳');
  const response = await page.request.get('/api/not-implemented');

  expect(response.status()).toBe(404);
  expect(world.get<string>('webOrigin')).toMatch(/^http:\/\/127\.0\.0\.1:/);
});

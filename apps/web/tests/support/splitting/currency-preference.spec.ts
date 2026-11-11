import { test, expect } from '../fixtures.js';
import { login } from '../browser.js';
import { seedExpense, seedTrip } from '../../../../api/tests/support/seed.js';

test('currency selection persists per trip across reloads and preserves existing expense currency', async ({
  page,
  world,
}) => {
  const first = await seedTrip(world, '韓國旅行');
  const second = await seedTrip(world, '日本旅行');
  const expense = await seedExpense(world, {
    tripName: '韓國旅行',
    item: '機票',
    currencyCode: 'TWD',
    amount: '15000',
  });

  await login(page, world);
  await page.goto(`/trips/${first.id}/expenses/new`);
  const currency = page.getByRole('combobox', { name: '幣別', exact: true });

  await expect(currency).toHaveValue(/^JPY\b/);
  await currency.fill('KRW');
  await page.getByRole('option', { name: /^KRW\b/ }).click();
  await page.reload();
  await expect(currency).toHaveValue(/^KRW\b/);
  await page.goto(`/trips/${second.id}/expenses/new`);
  await expect(currency).toHaveValue(/^JPY\b/);
  await currency.fill('USD');
  await page.getByRole('option', { name: /^USD\b/ }).click();
  await page.goto(`/trips/${first.id}/expenses/${expense.id}`);
  await expect(currency).toHaveValue(/^TWD\b/);
  await page.goto(`/trips/${first.id}/expenses/new`);
  await expect(currency).toHaveValue(/^KRW\b/);
  await page.goto(`/trips/${second.id}/expenses/new`);
  await expect(currency).toHaveValue(/^USD\b/);
});

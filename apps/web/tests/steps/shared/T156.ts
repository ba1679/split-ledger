import { When, expect } from '../../support/fixtures.js';
import { openExpenseForm } from '../../support/accounts-categories-trips.js';

When('使用者開啟新增支出表單', async ({ page, world }) => {
  const writes: string[] = [];
  world.set('web:formWrites', writes);
  page.on('request', request => { if (['POST', 'PATCH', 'DELETE'].includes(request.method()) && new URL(request.url()).pathname.startsWith('/api/')) writes.push(request.url()); });
  await openExpenseForm(page, world);
  await expect(page.getByLabel('支出項目', { exact: true })).toBeVisible();
});

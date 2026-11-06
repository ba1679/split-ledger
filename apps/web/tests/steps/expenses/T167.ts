import { Given, expect } from '../../support/fixtures.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { draft } from '../../support/expense-helpers.js';

Given('使用者在新增支出表單選擇 TWD 且金額為 100', async ({ page, world }) => {
  await draft(page, world, '午餐', '100', 'TWD');
  const response = await callApi(world, 'GET', '/api/currencies');

  expect(response.status()).toBe(200);
  const data = await response.json();

  expect(data.items.find((x: { code: string }) => x.code === 'TWD').minorUnit).toBe(2);
});

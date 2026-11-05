import { Given, expect } from '../../support/fixtures.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { draft } from '../../support/expense-helpers.js';

Given("使用者已開啟新增支出表單且幣別目錄可用", async ({ page, world }) => {
 await draft(page, world); const response = await callApi(world, 'GET', '/api/currencies'); expect(response.status()).toBe(200); const { items } = await response.json(); expect(items).toEqual(expect.arrayContaining([expect.objectContaining({code:'JPY',minorUnit:0}),expect.objectContaining({code:'USD',minorUnit:2})]));
});

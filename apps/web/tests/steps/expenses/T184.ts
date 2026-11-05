import { When, expect } from '../../support/fixtures.js';

When("使用者載入更多支出", async ({ page }) => {
 const response = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/expenses') && new URL(r.url()).searchParams.has('cursor')); await page.getByRole('button', { name: '載入更多', exact: true }).click(); expect((await response).status()).toBe(200);
});

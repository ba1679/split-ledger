import { Given, expect } from '../../support/fixtures.js';
import { draft, save, assertExpense } from '../../support/expense-helpers.js';

Given("同一 Google 帳號已在手機保存旅行支出", async ({ page, world }) => {
 const browser = page.context().browser(); expect(browser).not.toBeNull(); const phone = await browser!.newContext({ viewport: {width:390,height:844}, timezoneId:'Asia/Taipei', baseURL: world.get<string>('webOrigin') }); try { const mobilePage = await phone.newPage(); await draft(mobilePage, world); await save(mobilePage, world); await assertExpense(mobilePage, world, '午餐', '1200', 'JPY'); } finally { await phone.close(); }
});

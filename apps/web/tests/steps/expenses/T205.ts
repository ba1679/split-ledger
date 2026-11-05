import { Given, expect } from '../../support/fixtures.js';
import { fixedDate } from '../../support/expense-helpers.js';

Given("裝置當地日期為 \"2027-03-11\" 且使用者已有旅行", async ({ page, world }) => {
 await fixedDate(page, world, false); expect(await page.evaluate(() => new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0') + '-' + String(new Date().getDate()).padStart(2,'0'))).toBe('2027-03-11');
});

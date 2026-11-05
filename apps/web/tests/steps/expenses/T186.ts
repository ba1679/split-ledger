import { Then, expect } from '../../support/fixtures.js';
import { expenseLink, readLedger } from '../../support/expense-helpers.js';

Then("帳本不再顯示住宿", async ({ page, world }) => {
 await expect(expenseLink(page, '住宿')).toHaveCount(0); const ledger = await readLedger(world); expect(ledger.stored.some(x => x.item === '住宿')).toBe(false); expect(ledger.list.items.some(x => x.item === '住宿')).toBe(false);
});

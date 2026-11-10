import { When } from '../../../support/fixtures.js';
import { recordLegacyPersonalExpense } from '../../../support/splitting/legacy-expense-command.js';

When('owner 以舊版個人支出欄位記錄機票', async ({ world }) => {
  await recordLegacyPersonalExpense(world);
});

import { Given } from '../../../support/fixtures.js';
import { seedExpenseValidationMembers } from '../../../support/splitting/expense-validation-fixture.js';

Given('支出驗證用的停用與跨旅行成員已建立', async ({ world }) => {
  await seedExpenseValidationMembers(world);
});

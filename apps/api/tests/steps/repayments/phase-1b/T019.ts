import { Given } from '../../../support/fixtures.js';
import { seedRepaymentValidationMembers } from '../../../support/splitting/repayment-validation-fixture.js';

Given('還款驗證用的停用與跨旅行成員已建立', async ({ world }) => {
  await seedRepaymentValidationMembers(world);
});

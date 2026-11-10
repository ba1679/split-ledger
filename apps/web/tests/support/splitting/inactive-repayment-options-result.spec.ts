import { test } from '../fixtures.js';
import { seedInactiveReferencedMember } from './inactive-referenced-member-fixture.js';
import { openRepaymentMembers } from './open-repayment-members.js';
import { assertInactiveRepaymentOptions } from './inactive-repayment-options-result.js';

test('T191: repayment payer and payee exclude the inactive historical member without changing history', async ({
  page,
  world,
}) => {
  await seedInactiveReferencedMember(page, world, '小美');
  await openRepaymentMembers(page, world);
  await assertInactiveRepaymentOptions(page, world, '小美');
});

import { Given } from '../../../support/fixtures.js';
import { seedSplittingMembers } from '../../../support/splitting/members-fixture.js';

Given('owner 的分帳旅行已建立成員', async ({ world }) => {
  await seedSplittingMembers(world);
});

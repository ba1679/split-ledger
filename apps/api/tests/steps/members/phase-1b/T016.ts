import { Given } from '../../../support/fixtures.js';
import { deactivateSplittingMember } from '../../../support/splitting/inactive-member-fixture.js';

export const inactiveSplittingMemberPhrase = '同行者 {string} 已停用';

Given(inactiveSplittingMemberPhrase, async ({ world }, name: string) => {
  await deactivateSplittingMember(world, name);
});

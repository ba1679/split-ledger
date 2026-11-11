import { createBdd } from 'playwright-bdd';
import { Given, test } from '../../../support/fixtures.js';
import {
  memberLostResponsePhrase,
  memberLostResponseStateKey,
  seedBrowserMemberLostResponse,
  type MemberLostResponseState,
} from '../../../support/splitting/member-lost-response-fixture.js';

Given(memberLostResponsePhrase, async ({ page, world }) => {
  await seedBrowserMemberLostResponse(page, world);
});

const { After } = createBdd(test);
After(async ({ world }) => {
  const state = world.state.get(memberLostResponseStateKey) as MemberLostResponseState | undefined;
  await state?.restore();
});

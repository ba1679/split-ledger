import { When } from '../../../support/fixtures.js';
import { viewBrowserMembers, viewMembersPhrase } from '../../../support/splitting/view-members.js';

When(viewMembersPhrase, async ({ page, world }) => {
  await viewBrowserMembers(page, world);
});

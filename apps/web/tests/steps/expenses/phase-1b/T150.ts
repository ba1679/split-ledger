import { When } from '../../../support/fixtures.js';
import {
  replaceDinnerSharing,
  replaceDinnerSharingPhrase,
} from '../../../support/splitting/replace-dinner-sharing.js';

When(replaceDinnerSharingPhrase, async ({ page, world }) => {
  await replaceDinnerSharing(page, world);
});

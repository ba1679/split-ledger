import { Then } from '../../../support/fixtures.js';
import {
  assertNonsharingPayer,
  nonsharingPayerResultPhrase,
} from '../../../support/splitting/nonsharing-payer-result.js';

Then(nonsharingPayerResultPhrase, async ({ page, world }) => {
  await assertNonsharingPayer(page, world);
});

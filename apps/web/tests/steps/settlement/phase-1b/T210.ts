import { Then } from '../../../support/fixtures.js';
import {
  assertRejectedSimplificationScreen,
  rejectedSimplificationScreenPhrase,
} from '../../../support/splitting/rejected-simplification-screen-result.js';

Then(rejectedSimplificationScreenPhrase, async ({ page, world }) => {
  await assertRejectedSimplificationScreen(page, world);
});

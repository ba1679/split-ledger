import { Then } from '../../../support/fixtures.js';
import {
  assertFullyRepaidIndependentScreen,
  fullyRepaidIndependentPhrase,
} from '../../../support/splitting/fully-repaid-independent-result.js';

Then(fullyRepaidIndependentPhrase, async ({ page, world }) => {
  await assertFullyRepaidIndependentScreen(page, world);
});

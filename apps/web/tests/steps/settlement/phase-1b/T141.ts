import { Given } from '../../../support/fixtures.js';
import {
  arrangeRejectedSimplificationSave,
  rejectedSimplificationSavePhrase,
} from '../../../support/splitting/rejected-simplification-save.js';

Given(rejectedSimplificationSavePhrase, async ({ page, world }) => {
  await arrangeRejectedSimplificationSave(page, world);
});

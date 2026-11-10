import { When } from '../../../support/fixtures.js';
import {
  enableSimplificationPhrase,
  toggleSimplification,
} from '../../../support/splitting/toggle-simplification.js';

When(enableSimplificationPhrase, async ({ page, world }) => {
  await toggleSimplification(page, world, true);
});

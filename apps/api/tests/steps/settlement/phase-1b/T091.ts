import { Then } from '../../../support/fixtures.js';
import {
  assertSimplificationCount,
  simplificationCountPhrase,
} from '../../../support/splitting/simplification-count-result.js';

Then(simplificationCountPhrase, async ({ world }) => {
  await assertSimplificationCount(world);
});

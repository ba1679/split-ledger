import { Given } from '../../../support/fixtures.js';
import {
  unreferencedCarolPhrase,
  seedUnreferencedCarol,
} from '../../../support/splitting/unreferenced-carol-fixture.js';

Given(unreferencedCarolPhrase, async ({ page, world }) => {
  await seedUnreferencedCarol(page, world);
});

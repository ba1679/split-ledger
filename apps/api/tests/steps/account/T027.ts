import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T027: exact authoritative backend DSL registration.
Then('旅行清單包含"日本旅行"', async ({ world }) => {
  await b.tripInList(world);
});

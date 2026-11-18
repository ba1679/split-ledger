import { Then } from '../../../support/fixtures.js';
import { assertInitialSkeleton } from '../../../support/loading/initial-skeleton.js';

Then('指定內容顯示結構骨架且不提前顯示空值', async ({ world }) => {
  await assertInitialSkeleton(world);
});

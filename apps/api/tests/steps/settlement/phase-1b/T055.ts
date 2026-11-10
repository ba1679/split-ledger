import { When } from '../../../support/fixtures.js';
import {
  changeSimplificationMode,
  changeSimplificationPhrase,
} from '../../../support/splitting/change-simplification-command.js';

When(changeSimplificationPhrase, async ({ world }, mode: string) => {
  await changeSimplificationMode(world, mode);
});

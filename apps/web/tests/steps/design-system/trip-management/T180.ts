import { Then } from '../../../support/fixtures.js';
import { assertInitialResult } from '../../../support/loading/initial-result.js';

Then('畫面顯示 {string} 的權威資料且骨架結束', async ({ world }, content: string) => {
  await assertInitialResult(world, content);
});

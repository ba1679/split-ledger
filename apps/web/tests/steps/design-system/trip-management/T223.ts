import { Then } from '../../../support/fixtures.js';
import { assertSettlementStillUnknown } from '../../../support/loading/settlement-still-unknown.js';

Then('停止持續動畫並保留再次查證入口及草稿', async ({ world }) => {
  await assertSettlementStillUnknown(world);
});

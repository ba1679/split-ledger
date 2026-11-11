import { Given, When, Then } from '../../support/fixtures.js';
import {
  losePartialReply,
  recordPartialPayment,
  assertPartialSaved,
  assertPartialUnknown,
  openCurrentPayment,
  assertPrefilledRemaining,
} from '../../support/splitting/partial-payment.js';

Given('部分還款成功回應遺失且查證{string}', async ({ page, world }, availability: string) => {
  await losePartialReply(page, world, availability);
});

When('owner 開啟目前 {word} 支付 Alice 的實付表單', async ({ page, world }, payer: string) => {
  await openCurrentPayment(page, world, payer);
});
Then('實付欄預填 JPY {int} 且可修改', async ({ page, world }, amount: number) => {
  await assertPrefilledRemaining(page, world, amount);
});
When('owner 保存實付 JPY {int} 的部分還款', async ({ page, world }, amount: number) => {
  await recordPartialPayment(page, world, amount);
});
Then(
  '畫面顯示實付 JPY {int} 且剩餘 JPY {int} 尚未結清',
  async ({ page, world }, paid: number, remaining: number) => {
    await assertPartialSaved(page, world, paid, remaining);
  },
);
Then('部分還款草稿保留且結果尚未確認', async ({ page, world }) => {
  await assertPartialUnknown(page, world);
});

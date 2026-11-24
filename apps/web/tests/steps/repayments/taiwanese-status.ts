import { Given, Then, When, expect } from '../../support/fixtures.js';
import { readBrowserSplittingSnapshot } from '../../support/splitting/fixture.js';
import {
  arrangeLostResponse,
  arrangeRepaymentDraft,
  rejectRepayment,
  repaymentFixtureKey,
  submitRejectedRepayment,
  type RepaymentStatusFixture,
} from '../../support/splitting/repayment-status-008.js';

const offlineMessage = '請檢查網路連線，連線後再查看結果';
const failedDraftKey = '008:repayment-rejected-draft';

Given('繁中還款已保存但回覆遺失，原結果暫時無法查證且瀏覽器偵測離線', async ({ page, world }) => {
  await arrangeLostResponse(page, world, true, true);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
});

Given('繁中還款已保存但回覆遺失，原結果暫時無法查證且瀏覽器未偵測離線', async ({ page, world }) => {
  await arrangeLostResponse(page, world, false, true);
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
});

Given('繁中還款結果待確認且原還款可查證', async ({ page, world }) => {
  const fixture = await arrangeLostResponse(page, world, false, false);
  await expect(fixture.form.locator('.repayment-warning')).toBeVisible();
  await expect(fixture.form.locator('.repayment-warning button')).toBeEnabled();
  fixture.allowRecovery();
});

When('原次還款結果查證結束仍未知', async ({ page, world }) => {
  const fixture = world.get<RepaymentStatusFixture>(repaymentFixtureKey);
  fixture.release();
  await expect(page.locator('.repayment-warning button')).toBeEnabled();
});

When('owner 查看原還款結果', async ({ page, world }) => {
  const fixture = world.get<RepaymentStatusFixture>(repaymentFixtureKey);
  const verify = fixture.form
    .locator('.repayment-warning')
    .getByRole('button', { name: '查看結果', exact: true });
  await expect(verify).toBeVisible();
  const response = page.waitForResponse(
    (result) =>
      new URL(result.url()).pathname === `${fixture.path}/${fixture.id}` &&
      result.request().method() === 'GET',
  );
  await verify.click();
  expect((await response).status()).toBe(200);
});

Then('畫面提示「儲存結果待確認」及離線後的查看步驟', async ({ page, world }) => {
  const fixture = world.get<RepaymentStatusFixture>(repaymentFixtureKey);
  await expect(fixture.form.getByText('儲存結果待確認', { exact: true })).toBeVisible();
  await expect(fixture.form.getByRole('button', { name: '查看結果' })).toBeVisible();
  await expect(fixture.form.getByText(offlineMessage, { exact: true })).toBeVisible();
  await expect(fixture.form.getByLabel('金額', { exact: true })).toHaveValue('100');
  expect(fixture.writes).toHaveLength(1);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(fixture.after);
  await expect(page.getByText('還款已儲存', { exact: true })).toHaveCount(0);
});

Then('畫面提示「儲存結果待確認」和「查看結果」而無檢查網路提示', async ({ page, world }) => {
  const fixture = world.get<RepaymentStatusFixture>(repaymentFixtureKey);
  await expect(fixture.form.getByText('儲存結果待確認', { exact: true })).toBeVisible();
  await expect(fixture.form.getByRole('button', { name: '查看結果' })).toBeVisible();
  await expect(page.getByText(offlineMessage, { exact: true })).toHaveCount(0);
  await expect(fixture.form.getByLabel('金額', { exact: true })).toHaveValue('100');
  expect(fixture.writes).toHaveLength(1);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(fixture.after);
});

Then('原還款確認成功且只記錄一次', async ({ page, world }) => {
  const fixture = world.get<RepaymentStatusFixture>(repaymentFixtureKey);
  await expect(page.getByText('還款已儲存', { exact: true })).toBeVisible();
  expect(fixture.reads).toHaveLength(2);
  expect(new Set(fixture.reads)).toEqual(new Set([`${fixture.path}/${fixture.id}`]));
  expect(fixture.writes).toHaveLength(1);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(fixture.after);
});

Given('繁中還款草稿將收到明確儲存失敗', async ({ page, world }) => {
  const draft = await arrangeRepaymentDraft(page, world);
  await rejectRepayment(page, draft.path);
  world.set(failedDraftKey, draft);
});

When('owner 儲存還款草稿', async ({ page, world }) => {
  const draft = world.get<Awaited<ReturnType<typeof arrangeRepaymentDraft>>>(failedDraftKey);
  await submitRejectedRepayment(page, draft);
});

Then('還款畫面說明明確失敗原因及可採取的下一步', async ({ page, world }) => {
  const draft = world.get<Awaited<ReturnType<typeof arrangeRepaymentDraft>>>(failedDraftKey);
  const error = draft.form.getByRole('alert').filter({ hasText: /帳務|付款安排/u });
  await expect(error).toBeVisible();
  await expect(error).toContainText(/重新載入|更新後再/u);
  await expect(page.getByText(/儲存結果待確認|還款已儲存/u)).toHaveCount(0);
  await expect(draft.form.getByLabel('金額', { exact: true })).toHaveValue('100');
  expect(await readBrowserSplittingSnapshot(world)).toEqual(draft.before);
});

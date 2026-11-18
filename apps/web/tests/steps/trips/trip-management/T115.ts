import { Then, expect } from '../../../support/fixtures.js';
import type { TripManagementSnapshot } from '../../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../../api/tests/support/trip-management/preservation.js';
import { expectedCurrentState } from '../../../../../api/tests/support/trip-management/rejections.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import type { CommittedResponseLoss } from '../../../support/trips/committed-response-loss.js';
import { renderedImage } from '../../../support/thumbnail/rendered-image.js';

Then('畫面分別顯示原次結果與目前旅行狀態', async ({ world, browser }) => {
  const ui = managementUI(world),
    page = ui.page;
  const loss = world.get<CommittedResponseLoss>('management:responseLoss');
  const { variant, current, writes, verificationStart } = world.get<{
    variant: string;
    current: TripManagementSnapshot;
    writes: number;
    verificationStart: number;
  }>('management:recheck');
  const { tripId, operationId } = loss.command!;
  const expected = { result: loss.outcome!.result, currentState: expectedCurrentState(current) };
  expect(world.get('management:browserRecheck')).toEqual(expected);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(
    page
      .getByText(/(?:原次|原操作|本次|移入|保存|刪除)[^。]*?(?:已確認|已完成|成功|已保存)/)
      .first(),
  ).toBeVisible();
  const currentText =
    variant === '移入後已復原'
      ? /(?:目前|現在|後來)[^。]*(?:復原|一般可用)/
      : variant === '永久刪除'
        ? /(?:目前|現在)[^。]*(?:不存在|永久刪除)/
        : variant === '保存預設圖'
          ? /(?:目前|現在)[^。]*預設/
          : /(?:目前|現在)[^。]*(?:圖片|縮圖|已保存|一般可用)/;
  await expect(page.getByText(currentText).first()).toBeVisible();
  await expect(page.getByText(/結果尚未確認|尚無法確認.*結果/)).toBeHidden();
  await waitForManagementReads(ui);
  const lookups = loss.verifications.slice(verificationStart);
  expect(lookups.some((entry) => entry.operationId === operationId && !entry.blocked)).toBe(true);
  for (const lookup of lookups) {
    expect(lookup.blocked).toBe(false);
    if (lookup.operationId) expect(lookup.operationId).toBe(operationId);
    if (lookup.tripId) expect(lookup.tripId).toBe(tripId);
  }
  const remote = page.locator('img:visible[src*="/thumbnail/"]');
  if (variant === '永久刪除' || variant === '保存預設圖') await expect(remote).toHaveCount(0);
  else if (variant === '圖片後已換海邊') {
    await expect.poll(() => remote.count()).toBeGreaterThan(0);
    for (const image of await remote.all())
      await expect(image).toHaveAttribute(
        'src',
        new RegExp(`/thumbnail/${current.trips[0]!.thumbnail_revision}(?:\\?|$)`),
      );
  }
  if (variant === '永久刪除') {
    await expect(page.getByRole('region', { name: '成員淨額', exact: true })).toBeHidden();
    await expect(page.getByText('晚餐', { exact: true })).toBeHidden();
  }
  // A fresh device must agree with the primary page's current projection.
  const other = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: page.viewportSize(),
  });
  try {
    await other.addCookies(await page.context().cookies());
    const fresh = await other.newPage();
    await fresh.goto('/trips');
    const card = fresh.getByRole('link').filter({
      has: fresh.getByRole('heading', {
        name: variant === '新增附圖' ? '京都賞楓' : '日本旅行',
        exact: true,
      }),
    });
    if (variant === '永久刪除') await expect(card).toHaveCount(0);
    else {
      await expect(card).toHaveAttribute('href', `/trips/${tripId}`);
      if (current.thumbnails.length) {
        const image = card.locator('img:visible');
        await expect(image).toHaveAttribute(
          'src',
          new RegExp(`/thumbnail/${current.trips[0]!.thumbnail_revision}(?:\\?|$)`),
        );
        const actual = await renderedImage(image);
        const rgba =
          variant === '圖片後已換海邊'
            ? [45, 115, 189, 255]
            : variant === '新增附圖'
              ? [67, 140, 161, 255]
              : [109, 143, 172, 255];
        for (const [index, value] of rgba.entries())
          expect(Math.abs(actual.rgba[index]! - value)).toBeLessThanOrEqual(5);
      } else await expect(card.locator('img[src*="/thumbnail/"],img[src^="blob:"]')).toHaveCount(0);
    }
  } finally {
    await other.close();
  }
  const receipt = await ownerRead(world, `/api/trips/${tripId}/operations/${operationId}`);
  expect(receipt.status()).toBe(200);
  expect(await receipt.json()).toEqual(expected);
  expect(await managementSnapshot(world, tripId)).toEqual(current);
  expect(ui.writes.length).toBe(writes);
  expect(loss.mutations.length).toBe(1);
  await assertOtherDataUnchanged(world);
});

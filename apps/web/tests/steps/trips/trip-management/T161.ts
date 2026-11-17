import { Then, expect } from '../../../support/fixtures.js';
import type { CommittedResponseLoss } from '../../../support/trips/committed-response-loss.js';
import { assertUnknownOutcome } from '../../../support/trips/unknown-result.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import type { ThumbnailDraft } from '../../../support/thumbnail/draft-fixture.js';
import type { NewTripDraft } from '../../../support/trips/new-trip-fixture.js';

Then('旅行操作停止忙碌且保留原次查證入口', async ({ world }) => {
  await assertUnknownOutcome(world);
  const loss = world.get<CommittedResponseLoss>('management:responseLoss');
  const stopped = world.get<{ operationId: string; tripId: string; writes: number }>(
    'management:verificationStopped',
  );
  const ui = managementUI(world),
    page = ui.page;
  expect(stopped.operationId).toBe(loss.command!.operationId);
  expect(stopped.tripId).toBe(loss.command!.tripId);
  expect(ui.writes.length).toBe(stopped.writes);
  expect(ui.writes.length).toBe(loss.operation === '新增附圖' ? 2 : 1);
  expect(loss.pendingVerificationFailures).toBe(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(
    page.getByRole('status', { name: /正在.*(?:查證|確認)|(?:查證|確認)中/ }),
  ).toBeHidden();
  await expect(page.getByRole('button', { name: '再次查證', exact: true })).toBeEnabled();
  if (loss.operation === '保存圖片' || loss.operation === '新增附圖') {
    const draft = world.get<ThumbnailDraft>('management:draft');
    if (draft.intent === 'reset') {
      await expect(page.getByRole('dialog').getByText(/^(?:預設圖|預設旅行縮圖)$/)).toBeVisible();
      await expect(
        page.getByRole('status').filter({ hasText: /預設圖已保存|已恢復預設/ }),
      ).toBeHidden();
    } else {
      const file =
        loss.operation === '新增附圖'
          ? world.get<NewTripDraft>('management:newTripDraft').file!
          : draft.file!;
      // Unknown must retain the File without presenting an unconfirmed photo as saved.
      // The approved UI shows the last confirmed image (or a neutral new-trip placeholder).
      await expect(
        page.getByText(file.name, { exact: loss.operation !== '新增附圖' }),
      ).toBeVisible();
      if (loss.operation !== '新增附圖') {
        const input = page.getByRole('dialog').locator('input[type="file"]');
        const hash = await input.evaluate(async (element) => {
          const files = (element as HTMLInputElement).files;
          if (!files || files.length !== 1) throw new Error('Original draft File is missing');

          return [
            ...new Uint8Array(await crypto.subtle.digest('SHA-256', await files[0]!.arrayBuffer())),
          ]
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
        });
        expect(hash).toBe(file.asset.sha256);
      }
    }
  }
  if (loss.operation === '新增附圖')
    expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
});

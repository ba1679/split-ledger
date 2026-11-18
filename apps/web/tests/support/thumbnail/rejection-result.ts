import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { managementTripId } from '../../../../api/tests/support/trip-management/baseline.js';
import { managementUI } from '../trips/management-fixture.js';
import { assertManagementUnchanged } from '../trips/management-assertions.js';
import type { InvalidSelection } from './invalid-selection.js';
import type { RejectedSelectionAct } from './reject-selection.js';

export async function assertRejectedSelection(world: LedgerWorld, reason: string): Promise<void> {
  const selection = world.get<InvalidSelection>('management:invalidSelection');
  expect(selection.reason).toBe(reason);
  const act = world.get<RejectedSelectionAct>('management:rejectedSelectionAct');
  const { page } = managementUI(world),
    dialog = page.getByRole('dialog');
  const animation = ['APNG動畫', 'WebP動畫'].includes(reason);
  const oversized = [
    '超過10MiB',
    '超過25000000像素',
    '寬超16384',
    '高超16384',
    '一次兩張',
  ].includes(reason);
  const corrupt = ['文字偽裝PNG', '截斷JPEG', '零寬', '零高'].includes(reason);
  const empty = reason === '空檔';
  const obvious = [
    'HEIC',
    'HEIF',
    'AVIF',
    '靜態GIF',
    '動態GIF',
    'SVG',
    '多頁TIFF',
    'PDF',
    '超過10MiB',
    '空檔',
    '一次兩張',
  ].includes(reason);
  if (obvious)
    expect(act.source, 'Declared unsupported type/count/size is locally observable').toBe('local');
  if (act.source === 'server') {
    expect(act.response).toBeDefined();
    const status = oversized ? 413 : corrupt ? 422 : empty ? 400 : 415;
    const code = oversized
      ? 'IMAGE_TOO_LARGE'
      : corrupt
        ? 'INVALID_IMAGE'
        : empty
          ? 'VALIDATION_ERROR'
          : 'UNSUPPORTED_IMAGE_TYPE';
    expect(act.response!.status()).toBe(status);
    expect(await act.response!.json()).toMatchObject({ code, message: expect.any(String) });
    const receipt = await ownerRead(
      world,
      `/api/trips/${managementTripId(world)}/operations/${act.operationId}`,
    );
    expect(receipt.status()).toBe(404);
    expect(await receipt.json()).toMatchObject({ code: 'OPERATION_NOT_FOUND' });
  }
  const error = dialog.getByRole('alert').filter({ hasText: /\S/ }).first();
  await expect(error).toBeVisible();
  const pattern = animation
    ? /動畫|動態|多幀/
    : reason === '空檔'
      ? /空|沒有.*內容|0\s*(?:byte|位元)|檔案.*無效/i
      : reason === '一次兩張'
        ? /單張|一張|多張|兩張/
        : reason === '超過10MiB'
          ? /10\s*MiB|容量|檔案.*(?:大|上限)/i
          : reason === '超過25000000像素'
            ? /總像素|2[ ,]?500\s*萬|25[ ,]?000[ ,]?000/
            : ['寬超16384', '高超16384'].includes(reason)
              ? /最長邊|單邊|16[ ,]?384/
              : ['零寬', '零高'].includes(reason)
                ? /尺寸|寬|高|像素|無效/
                : corrupt
                  ? /損壞|無法讀|無法解碼|有效.*圖片|不是.*圖片|圖片.*無效|內容.*不符/
                  : /不支援|格式|內容.*(?:不符|不一致)/;
  await expect(error).toContainText(pattern);
  await expect(error).not.toContainText(/尚未確認|結果未知|查證中/);
  await expect(dialog.getByText(/支援.*(?:JPG|JPEG).*PNG.*WebP/i).first()).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ })).toBeEnabled();
  await expect(dialog.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(dialog.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: /圖片已保存|保存成功/ })).toBeHidden();
  expect(await page.locator('body').innerText()).not.toMatch(
    /IMAGE_TOO_LARGE|INVALID_IMAGE|UNSUPPORTED_IMAGE_TYPE|VALIDATION_ERROR/,
  );
  if (await dialog.locator('img[src^="blob:"]:visible').count())
    await expect(dialog.getByText('尚未保存', { exact: true })).toBeVisible();
  await assertManagementUnchanged(world, act.writes + (act.source === 'server' ? 1 : 0));
}

import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  selectInvalidImage,
  invalidImageLabels,
} from '../../../../api/tests/support/trip-management/invalid-images.js';
import {
  selectExactImage,
  type UploadImage,
} from '../../../../api/tests/support/trip-management/generated-images.js';
import { assertManagementUnchanged } from '../trips/management-assertions.js';
import { managementUI } from '../trips/management-fixture.js';

export interface InvalidSelection {
  reason: string;
  files: readonly UploadImage[];
}

export async function arrangeInvalidSelection(world: LedgerWorld, reason: string): Promise<void> {
  const aliases: Record<string, string> = {
    APNG動畫: 'APNG',
    WebP動畫: '動態WebP',
    零寬: '零寬PNG',
    零高: '零高PNG',
    空檔: '零bytesJPEG',
  };
  const mapped = aliases[reason] ?? reason;
  if ((invalidImageLabels as readonly string[]).includes(mapped))
    await selectInvalidImage(world, mapped);
  else if (reason === '超過10MiB') await selectExactImage(world, 'PNG', 10485761, 64, 48);
  else if (reason === '超過25000000像素') await selectExactImage(world, 'PNG', 1048576, 5001, 5000);
  else if (reason === '寬超16384') await selectExactImage(world, 'PNG', 65536, 16385, 1);
  else if (reason === '高超16384') await selectExactImage(world, 'PNG', 65536, 1, 16385);
  else {
    expect(reason).toBe('一次兩張');
    await selectExactImage(world, 'JPEG .jpg', 65536, 64, 48);
    const first = world.get<UploadImage[]>('management:uploadFiles');
    await selectExactImage(world, 'JPEG .jpeg', 65536, 48, 64);
    const second = world.get<UploadImage[]>('management:uploadFiles');
    expect(first[0]!.asset.sha256).not.toBe(second[0]!.asset.sha256);
    world.set('management:uploadFiles', [...first, ...second]);
  }
  const files = world.get<UploadImage[]>('management:uploadFiles');
  expect(files).toHaveLength(reason === '一次兩張' ? 2 : 1);
  expect(managementUI(world).writes.length).toBe(0);
  await expect(
    managementUI(world).page.getByRole('dialog').locator('img[src^="blob:"]'),
  ).toHaveCount(0);
  world.set('management:invalidSelection', { reason, files } satisfies InvalidSelection);
  await assertManagementUnchanged(world);
}

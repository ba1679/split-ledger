import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  assertOtherDataUnchanged,
  ownerRead,
} from '../../../../api/tests/support/trip-management/preservation.js';
import type { NewTripFlow } from './new-trip-flow.js';
import { createTripBody } from './new-trip-flow.js';
import type { NewTripDraft } from './new-trip-fixture.js';
import type { CreateResponseLoss } from './create-response-loss.js';
import { managementUI, waitForManagementReads } from './management-fixture.js';
import { renderedImage } from '../thumbnail/rendered-image.js';

export async function assertCreateUnknown(world: LedgerWorld): Promise<void> {
  const loss = world.get<CreateResponseLoss>('management:createResponseLoss');
  const flow = world.get<NewTripFlow>('management:newTripFlow');
  const draft = world.get<NewTripDraft>('management:newTripDraft');
  const { page } = managementUI(world),
    dialog = page.getByRole('dialog');
  expect(loss.error).toBeUndefined();
  expect(loss.arrived && loss.released && loss.finished).toBe(true);
  await expect(dialog).toBeVisible();
  await expect(page.getByText(/(?:建立|結果)[^。]*(?:尚未確認|無法確認)/).first()).toBeVisible({
    timeout: 15000,
  });
  const verify = page.getByRole('button', { name: '再次查證', exact: true });
  await expect(verify).toBeVisible();
  await expect(verify).toBeEnabled({ timeout: 15000 });
  await expect(dialog.getByRole('button', { name: '建立旅行', exact: true })).toBeDisabled();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByText(/^旅行已建立(?:[，。]|$)|^旅行建立成功|^旅行建立失敗/)).toBeHidden();
  for (const [label, value] of [
    [/^旅行名稱$/, draft.name],
    [/^開始日/, ''],
    [/^結束日/, ''],
  ] as const)
    await expect(dialog.getByRole('textbox', { name: label })).toHaveValue(value);
  await expect(dialog.getByText(draft.file!.name, { exact: true })).toBeVisible();
  const preview = dialog.locator('img[src^="blob:"]:visible');
  expect(await renderedImage(preview)).toEqual({
    width: 64,
    height: 48,
    rgba: [67, 140, 161, 255],
  });
  const hash = await preview.evaluate(async (element) => {
    const bytes = await (await fetch((element as HTMLImageElement).src)).arrayBuffer();

    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  });
  expect(hash).toBe(draft.file!.asset.sha256);
  expect(flow.creates).toHaveLength(1);
  expect(flow.images).toHaveLength(0);
  expect(flow.errors.map(String)).toEqual([]);
  expect(createTripBody(flow.creates[0]!).id).toBe(loss.tripId);
  expect(flow.failures.has(flow.creates[0]!)).toBe(true);
  expect(loss.verifications.some((row) => row.state && row.tripId === loss.tripId)).toBe(true);
  for (const lookup of loss.verifications) {
    expect(lookup.blocked).toBe(true);
    if (lookup.tripId) expect(lookup.tripId).toBe(loss.tripId);
  }
  await waitForManagementReads(managementUI(world));
  expect(managementUI(world).writes.length).toBe(1);
  expect(await page.locator('body').innerText()).not.toContain(loss.tripId!);
  expect(await managementSnapshot(world, loss.tripId)).toEqual(loss.created);
  const current = await ownerRead(world, `/api/trips/${loss.tripId}`);
  expect(current.status()).toBe(200);
  expect(await current.json()).toMatchObject({
    id: loss.tripId,
    name: draft.name,
    hasThumbnail: false,
    thumbnailRevision: '0',
  });
  const ids = (
    await world.db.query('SELECT id FROM trips WHERE owner_id=$1 ORDER BY id', [
      world.users.get('Alice')!.id,
    ])
  ).rows.map((row: { id: string }) => row.id);
  expect(ids).toEqual([...world.get<string[]>('management:newTripIdsBefore'), loss.tripId!].sort());
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
  await assertOtherDataUnchanged(world);
}

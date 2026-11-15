import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  assertOtherDataUnchanged,
  ownerRead,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { managementUI } from '../trips/management-fixture.js';
import type { ThumbnailRead } from './read-fixture.js';

export async function assertCardIdentity(world: LedgerWorld) {
  const state = world.get<ThumbnailRead>('management:thumbnailRead');
  const { page } = managementUI(world);
  const heading = page.getByRole('heading', { name: state.name, exact: true });
  const card = page.getByRole('link').filter({ has: heading });
  await expect(heading).toBeVisible();
  await expect(card).toHaveAttribute('href', `/trips/${state.tripId}`);
  await expect(
    card.getByText(`${state.item.startDate} — ${state.item.endDate}`, { exact: true }),
  ).toBeVisible();
  await expect(card.getByText(`${state.item.expenseCount} 筆支出`, { exact: true })).toBeVisible();
  await expect(card.getByText('開啟旅行帳本', { exact: true })).toBeVisible();
  await card.click({ trial: true });
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  for (const key of ['x', 'y', 'width', 'height'] as const)
    expect(
      Math.abs(box![key] - state.cardBox[key]),
      `Card ${key} must not shift due to image loading`,
    ).toBeLessThanOrEqual(1);
  const text = await heading.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      whiteSpace: style.whiteSpace,
      lineHeight: parseFloat(style.lineHeight),
      height: element.getBoundingClientRect().height,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    };
  });
  expect(text.whiteSpace).not.toBe('nowrap');
  expect(text.height).toBeGreaterThanOrEqual(text.lineHeight * 1.9);
  expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth + 1);
  expect(text.scrollHeight).toBeLessThanOrEqual(text.clientHeight + 1);

  return { state, page, card };
}

export async function assertReadOnlyThumbnail(world: LedgerWorld): Promise<void> {
  const ui = managementUI(world);
  // A held binary request is intentionally pending; all ordinary data must have settled.
  await expect
    .poll(
      () =>
        [...ui.pending].filter((request) => !/\/thumbnail\//.test(new URL(request.url()).pathname))
          .length,
    )
    .toBe(0);
  expect(ui.writes.length).toBe(0);
  const before = world.get('management:before');
  expect(await managementSnapshot(world)).toEqual(before);
  const state = world.get<ThumbnailRead>('management:thumbnailRead');
  const response = await ownerRead(
    world,
    `/api/trips/${state.tripId}/thumbnail/${state.item.thumbnailRevision}`,
  );
  expect(response.status()).toBe(200);
  expect(await response.body()).toEqual(world.get('management:originalImage'));
  expect(await managementSnapshot(world)).toEqual(before);
  await assertOtherDataUnchanged(world);
}

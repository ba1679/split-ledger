import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';
import { chooseCurrency } from '../expense-helpers.js';
import { arrangeThumbnailRead } from './read-fixture.js';
import { viewThumbnailCard } from './view-card.js';
import { assertThumbnailFallback } from './fallback-result.js';
import { assertReadOnlyThumbnail } from './card-result.js';
import type { ThumbnailRead } from './read-fixture.js';

export async function arrangeBreakfast(page: Page, world: LedgerWorld): Promise<void> {
  await arrangeThumbnailRead(page, world, '明確失敗');
  await viewThumbnailCard(world);
  await assertThumbnailFallback(world);
  const state = world.get<ThumbnailRead>('management:thumbnailRead');
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: state.name, exact: true }) })
    .click();
  await expect(page.getByRole('heading', { name: state.name, exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '成員淨額', exact: true })).toBeVisible();
  await expect(page.getByText('晚餐', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '記一筆', exact: true }).click();
  await page.getByLabel('支出項目', { exact: true }).fill('早餐');
  await chooseCurrency(page, 'TWD');
  await page.getByLabel('支出金額', { exact: true }).fill('100');
  await page.getByRole('radio', { name: 'Alice', exact: true }).check();
  for (const name of ['Alice', 'Amy'])
    await page.getByRole('checkbox', { name, exact: true }).check();
  await page.getByRole('checkbox', { name: 'Charlie', exact: true }).uncheck();
  await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeEnabled();
  await waitForManagementReads(managementUI(world));
  const before = world.get<TripManagementSnapshot>('management:before');
  const memberId = (name: string) => String(before.members.find((row) => row.name === name)!.id);
  world.set('management:breakfastDraft', {
    item: '早餐',
    amount: '100',
    currencyCode: 'TWD',
    spentOn: (
      await page.getByRole('textbox', { name: '支出日期', exact: true }).inputValue()
    ).replaceAll('/', '-'),
    payerMemberId: memberId('Alice'),
    shareMemberIds: [memberId('Alice'), memberId('Amy')].sort(),
  });
  await assertReadOnlyThumbnail(world);
}

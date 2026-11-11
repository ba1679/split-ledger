import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  seedSplittingMembers,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { login } from '../browser.js';
import { chooseCurrency, dateInput, amountInput } from '../expense-helpers.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const sharedExpenseDraftPhrase = 'owner 已填共同支出點心 JPY 100、付款 Alice、分攤 {}';

export const sharedExpenseDraftKey = 'splitting:expenseDraft';

export const sharedExpenseBeforeKey = 'splitting:expenseBefore';

export const sharedExpensePostsKey = 'splitting:expensePosts';

export const expenseDraftMemberNames = ['Alice', 'Amy', 'Bob'] as const;

export interface SharedExpenseDraft {
  item: string;
  amount: string;
  currencyCode: string;
  spentOn: string;
  categoryId: null;
  payerMemberId: string | null;
  shareMemberIds: string[];
}

export function parseExpenseShareNames(value: string): string[] {
  const names = value.split('、').map((name) => name.trim());
  expect(
    names.every((name) =>
      expenseDraftMemberNames.includes(name as (typeof expenseDraftMemberNames)[number]),
    ),
    'Share collection must contain valid trip member names',
  ).toBe(true);
  expect(new Set(names).size, 'Share collection must not repeat a member').toBe(names.length);

  return names;
}

/** User-visible form interactions only; this page object never submits or injects DOM state. */
export class SharedExpenseForm {
  constructor(readonly page: Page) {}

  async open(tripId: string): Promise<void> {
    await this.page.goto(`/trips/${tripId}/expenses/new`);
    await expect(this.page.getByLabel('支出項目', { exact: true })).toBeVisible();
    await expect(this.page.getByRole('button', { name: '儲存支出', exact: true })).toBeEnabled();
  }

  async fillSnack(): Promise<void> {
    await this.page.getByLabel('支出項目', { exact: true }).fill('點心');
    await chooseCurrency(this.page, 'JPY');
    await amountInput(this.page).fill('100');
    await dateInput(this.page).fill('2027/03/11');
    await dateInput(this.page).press('Tab');
    const category = this.page.getByRole('combobox', { name: /^分類(?:選填)?$/ });
    await category.fill('');
    await this.page.getByRole('option', { name: '未分類', exact: true }).click();
  }

  async choosePayer(name: string): Promise<void> {
    const payer = this.page.getByRole('radio', { name, exact: true });
    await expect(payer, 'Shared expense form must expose an accessible payer choice').toBeVisible();
    await payer.check();
    await expect(payer).toBeChecked();
    await expect(
      this.page.getByRole('radio').filter({ visible: true }).and(this.page.locator(':checked')),
    ).toHaveCount(1);
  }

  async chooseShares(names: readonly string[]): Promise<void> {
    for (const name of expenseDraftMemberNames) {
      const choice = this.page.getByRole('checkbox', { name, exact: true });
      await expect(
        choice,
        'Shared expense form must expose accessible sharing choices',
      ).toBeVisible();
      await choice.setChecked(names.includes(name));
      if (names.includes(name)) await expect(choice).toBeChecked();
      else await expect(choice).not.toBeChecked();
    }
  }
}

/** A clean Alice/Amy/Bob trip, with only real owner API reads and a browser session. */
export async function arrangeSharedExpenseForm(
  page: Page,
  world: LedgerWorld,
): Promise<SharedExpenseForm> {
  await seedSplittingMembers(world);
  const tripId = splittingTripId(world);
  const carolId = world.splitting.ids.members.get('Carol')!;
  await world.db.query('DELETE FROM trip_members WHERE id=$1 AND trip_id=$2', [carolId, tripId]);
  world.splitting.ids.members.delete('Carol');
  await world.db.query('UPDATE trips SET start_date=$2,end_date=$2 WHERE id=$1', [
    tripId,
    '2027-03-11',
  ]);
  const before = await readBrowserSplittingSnapshot(world);
  expect(before.sources.members.map((member) => member.name).sort()).toEqual([
    ...expenseDraftMemberNames,
  ]);
  expect(before.expenses.items).toEqual([]);
  world.set(sharedExpenseBeforeKey, before);
  world.set(sharedExpensePostsKey, []);
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === `/api/trips/${tripId}/expenses`
    )
      world.get<unknown[]>(sharedExpensePostsKey).push(request.postDataJSON());
  });
  await login(page, world);
  const form = new SharedExpenseForm(page);
  await form.open(tripId);
  await form.fillSnack();

  return form;
}

export async function fillSharedSnackDraft(
  page: Page,
  world: LedgerWorld,
  collection: string,
): Promise<void> {
  const names = parseExpenseShareNames(collection);
  const form = await arrangeSharedExpenseForm(page, world);
  await form.choosePayer('Alice');
  await form.chooseShares(names);
  const draft: SharedExpenseDraft = {
    item: '點心',
    amount: '100',
    currencyCode: 'JPY',
    spentOn: '2027-03-11',
    categoryId: null,
    payerMemberId: world.splitting.ids.members.get('Alice')!,
    shareMemberIds: names.map((name) => world.splitting.ids.members.get(name)!),
  };
  world.set(sharedExpenseDraftKey, draft);
  expect(world.get<unknown[]>(sharedExpensePostsKey), 'Given must not save the draft').toEqual([]);
  const before = world.get<BrowserSplittingSnapshot>(sharedExpenseBeforeKey);
  expect(await snapshotSplittingSources(world)).toEqual(before.sources);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}

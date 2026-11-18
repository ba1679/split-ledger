import { expectedOwnerList } from '../../../../api/tests/support/trip-management/lists.js';
import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../api/tests/support/trip-management/preservation.js';
import type {
  Category,
  Expense,
  ExpenseList,
  ItemList,
  PersonalCurrencyTotal,
  Trip,
  TripMember,
} from '../../../src/api/index.js';
import type { SettlementView } from '../../../src/features/settlement/types.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';
import type { InitialRead } from './initial-read.js';
import { initialContentRegion } from './initial-skeleton.js';

const comma = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Exact fixtures use integral major-unit amounts; reject rounding in the assertion oracle. */
function exactMajor(amount: ExactAmount): string {
  const divisor = BigInt(amount.denominator) * 10n ** BigInt(amount.minorUnit);
  expect(BigInt(amount.numerator) % divisor).toBe(0n);

  return (BigInt(amount.numerator) / divisor).toString();
}

export async function assertInitialResult(world: LedgerWorld, content: string): Promise<void> {
  const state = world.get<InitialRead>('loading:initial'),
    ui = managementUI(world),
    page = ui.page;
  expect(content).toBe(state.content);
  expect(state.released).toBe(true);
  await waitForManagementReads(ui);
  const region = initialContentRegion(page, state);
  await expect(region).toBeVisible();
  await expect(region).not.toHaveAttribute('aria-busy', 'true');
  await expect(
    region.locator('[data-skeleton]:visible, .skeleton:visible, .query-skeleton:visible'),
  ).toHaveCount(0);
  await expect(
    region.getByRole('status').filter({ hasText: /載入|讀取中|整理中|等待/ }),
  ).toHaveCount(0);
  const name = (id: string) =>
    String(state.before.members.find((member) => member.id === id)!.name);
  switch (content) {
    case '一般旅行': {
      const items = (state.authority as ItemList<Trip>).items;
      for (const trip of items) {
        const card = region
          .locator('a, article, li')
          .filter({ has: page.getByRole('heading', { name: trip.name, exact: true }) })
          .filter({ hasText: `${trip.expenseCount} 筆支出` })
          .last();
        await expect(card).toBeVisible();
        if (trip.startDate) await expect(card).toContainText(trip.startDate);
        if (trip.endDate) await expect(card).toContainText(trip.endDate);
      }
      await expect(region.getByRole('heading', { name: '私人旅行', exact: true })).toHaveCount(0);
      expect(items.length).toBe(2);
      break;
    }
    case '已移入垃圾桶的旅行': {
      const items = (
        state.authority as {
          items: {
            id: string;
            name: string;
            deletedAt: string;
            hasThumbnail: boolean;
            lifecycleRevision: string;
            thumbnailRevision: string;
          }[];
        }
      ).items;
      expect(items).toEqual(await expectedOwnerList(world, 'trash'));
      expect(items.length).toBe(1);
      for (const trip of items) {
        const heading = region.getByRole('heading', { name: trip.name, exact: true });
        await expect(heading).toHaveCount(1);
        const card = region
          .locator('a,article,li')
          .filter({ has: page.getByRole('heading', { name: trip.name, exact: true }) })
          .last();
        await expect(card).toBeVisible();
        await expect(card.getByRole('button', { name: '復原旅行', exact: true })).toBeEnabled();
        await expect(card.getByRole('button', { name: '永久刪除', exact: true })).toBeEnabled();
        if (trip.hasThumbnail) {
          const image = card.locator('img:visible');
          await expect(image).toHaveCount(1);
          await expect(image).toHaveJSProperty('complete', true);
          expect(
            await image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
          ).toBeGreaterThan(0);
        }
      }
      await expect(region.getByRole('heading', { name: '私人旅行', exact: true })).toHaveCount(0);
      break;
    }
    case '旅行資料': {
      const trip = state.authority as Trip;
      await expect(region.getByRole('heading', { name: trip.name, exact: true })).toBeVisible();
      await expect(region).toContainText(trip.startDate!);
      await expect(region).toContainText(trip.endDate!);
      break;
    }
    case '各幣別總額': {
      const totals = (state.authority as { totals: PersonalCurrencyTotal[] }).totals;
      expect(
        Object.fromEntries(totals.map((total) => [total.currencyCode, exactMajor(total.amount)])),
      ).toEqual({ JPY: '2000', TWD: '300' });
      await expect(region.getByRole('group')).toHaveCount(totals.length);
      for (const total of totals) {
        const card = region.getByRole('group', { name: total.currencyCode, exact: true });
        await expect(card).toContainText(comma(exactMajor(total.amount)));
      }
      break;
    }
    case '支出清單': {
      const data = state.authority as ExpenseList;
      expect(data.totalCount).toBe(state.before.expenses.length);
      await expect(region.getByRole('link')).toHaveCount(data.items.length);
      for (const expense of data.items) {
        const row = region.locator(`a[href="/trips/${expense.tripId}/expenses/${expense.id}"]`);
        for (const text of [
          expense.item,
          expense.spentOn,
          expense.currencyCode,
          comma(expense.amount),
          expense.category?.name ?? '未分類',
        ])
          await expect(row).toContainText(text);
      }
      break;
    }
    case '該筆支出與分攤':
    case '既有支出表單資料': {
      const expense = state.authority as Expense;
      await expect(region.getByLabel('支出項目', { exact: true })).toHaveValue(expense.item);
      await expect(region.getByLabel('金額', { exact: true })).toHaveValue(expense.amount);
      await expect(region.getByRole('textbox', { name: '支出日期', exact: true })).toHaveValue(
        expense.spentOn.replaceAll('-', '/'),
      );
      await expect(region.getByRole('combobox', { name: '幣別', exact: true })).toHaveValue(
        new RegExp(`^${expense.currencyCode}\\b`),
      );
      await expect(
        region.getByRole('radio', { name: name(expense.payerMemberId), exact: true }),
      ).toBeChecked();
      for (const member of state.before.members.filter(
        (row) => row.is_active || expense.shares.some((share) => share.memberId === row.id),
      ))
        await expect(
          region.getByRole('checkbox', { name: String(member.name), exact: true }),
        ).toBeChecked({ checked: expense.shares.some((share) => share.memberId === member.id) });
      const shares = region.getByRole('list', { name: '支出分攤', exact: true });
      await expect(shares.getByRole('listitem')).toHaveCount(expense.shares.length);
      for (const share of expense.shares) {
        const row = shares.getByRole('listitem').filter({ hasText: name(share.memberId) });
        await expect(row).toContainText(`${expense.currencyCode} ${exactMajor(share.amount)}`);
        expect(exactMajor(share.amount)).toBe('1000');
      }
      break;
    }
    case '分類清單': {
      const items = (state.authority as ItemList<Category>).items;
      for (const category of items) {
        await expect(region.getByText(category.name, { exact: true })).toBeVisible();
        await expect(
          region.getByRole('button', { name: `改名：${category.name}`, exact: true }),
        ).toBeVisible();
      }
      break;
    }
    case '同行者清單': {
      const items = (state.authority as ItemList<TripMember>).items;
      await expect(region.getByRole('listitem')).toHaveCount(items.length);
      for (const member of items)
        await expect(region.getByText(member.name, { exact: true })).toBeVisible();
      break;
    }
    case '付款安排': {
      const data = state.authority as SettlementView;
      await expect(region.getByRole('group')).toHaveCount(data.arrangements.length);
      for (const arrangement of data.arrangements) {
        const row = region.getByRole('group', {
          name: `${name(arrangement.debtorMemberId)} 付款給 ${name(arrangement.creditorMemberId)} ${arrangement.currencyCode}`,
          exact: true,
        });
        await expect(row).toContainText(
          `${arrangement.currencyCode} ${exactMajor(arrangement.amount)}`,
        );
      }
      break;
    }
    case '還款所需旅行與成員資料': {
      const members = (state.authority as ItemList<TripMember>).items;
      for (const label of ['付款人', '收款人']) {
        const select = region.getByRole('combobox', { name: label, exact: true });
        await expect(select).toBeEnabled();
        expect(
          await select.locator('option').evaluateAll((options) =>
            options
              .map((option) => (option as HTMLOptionElement).value)
              .filter(Boolean)
              .sort(),
          ),
        ).toEqual(
          members
            .filter((member) => member.isActive)
            .map((member) => member.id)
            .sort(),
        );
      }
      const tripId = new URL(page.url()).pathname.split('/')[2];
      const trip = state.before.trips.find((row) => row.id === tripId)!;
      expect(trip).toBeDefined();
      const tripLink = page
        .getByRole('main')
        .getByRole('link', { name: String(trip.name), exact: true });
      await expect(tripLink).toBeVisible();
      await expect(tripLink).toHaveAttribute('href', `/trips/${tripId}/settlement`);
      break;
    }
    case '目前待結清安排': {
      const view = state.authority as SettlementView;
      const key = new URL(page.url()).searchParams.get('arrangementKey');
      const arrangement = view.arrangements.find((entry) => entry.key === key)!;
      expect(arrangement).toBeDefined();
      await expect(region).toContainText(name(arrangement.debtorMemberId));
      await expect(region).toContainText(name(arrangement.creditorMemberId));
      await expect(region).toContainText(arrangement.currencyCode);
      await expect(region.getByLabel('實付金額', { exact: true })).toHaveValue(
        exactMajor(arrangement.amount),
      );
      break;
    }
    default:
      throw new Error(`Unmapped initial content: ${content}`);
  }
  expect(ui.writes.length).toBe(0);
  expect(await managementSnapshot(world)).toEqual(state.before);
  await assertOtherDataUnchanged(world);
}

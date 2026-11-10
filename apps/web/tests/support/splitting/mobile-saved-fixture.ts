import { expect, type Browser } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { login } from '../browser.js';
import {
  browserSplittingStateKey,
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
} from './fixture.js';

export const mobileSavedSplittingPhrase = 'owner 的手機已保存目前分帳資料';

export const mobileSavedSplittingKey = 'splitting:mobileSaved';

export interface MobileSavedSplitting {
  tripId: string;
  memberIds: string[];
  expenseIds: string[];
  members: { id: string; name: string; role: string; isActive: boolean }[];
  snapshot: BrowserSplittingSnapshot;
}

/** A real owner phone context reads already saved data, then is discarded. */
export async function captureMobileSavedSplitting(
  browser: Browser,
  world: LedgerWorld,
): Promise<void> {
  const initial = world.get<BrowserSplittingSnapshot>(browserSplittingStateKey);
  expect(initial.sources.members.length, 'Phone fixture requires saved members').toBeGreaterThan(0);
  expect(initial.expenses.items.length, 'Phone fixture requires saved expenses').toBeGreaterThan(0);
  const tripId = splittingTripId(world);
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    baseURL: world.get<string>('webOrigin'),
    timezoneId: 'Asia/Taipei',
  });
  try {
    const page = await context.newPage();
    await login(page, world);
    await page.goto(`/trips/${tripId}`);
    await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();

    async function read<T>(suffix: string): Promise<T> {
      const response = await context.request.get(`/api/trips/${tripId}${suffix}`);
      expect(response.status(), `Phone owner session must read ${suffix}`).toBe(200);

      return (await response.json()) as T;
    }

    const memberList = await read<{ items: MobileSavedSplitting['members'] }>('/members');
    const members = memberList.items.map(({ id, name, role, isActive }) => ({
      id,
      name,
      role,
      isActive,
    }));
    const byId = <T extends { id: string }>(rows: T[]) =>
      [...rows].sort((left, right) => left.id.localeCompare(right.id));
    expect(byId(members)).toEqual(
      byId(
        initial.sources.members.map((member) => ({
          id: String(member.id),
          name: String(member.name),
          role: String(member.role),
          isActive: member.is_active as boolean,
        })),
      ),
    );
    expect(await read('/expenses?limit=100')).toEqual(initial.expenses);
    expect(await read('/settlement')).toEqual(initial.settlement);
    const saved = await readBrowserSplittingSnapshot(world);
    expect(saved, 'Opening the phone must not rebuild or change saved splitting data').toEqual(
      initial,
    );
    world.set(mobileSavedSplittingKey, {
      tripId,
      memberIds: members.map((member) => member.id).sort(),
      expenseIds: saved.expenses.items.map((expense) => expense.id).sort(),
      members,
      snapshot: saved,
    } satisfies MobileSavedSplitting);
  } finally {
    await context.close();
  }
}

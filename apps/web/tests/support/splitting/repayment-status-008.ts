import { expect, type Page } from '@playwright/test';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { chooseCurrency } from '../expense-helpers.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { seedTaiwaneseCompanions } from './taiwanese-fixture.js';
import { randomUUID } from 'node:crypto';

export const repaymentFixtureKey = '008:repayment-status';

export async function arrangeRepaymentDraft(page: Page, world: LedgerWorld, language = 'zh-TW') {
  await seedTaiwaneseCompanions(page, world, ['小宇'], language);
  const trip = splittingTripId(world);
  const from = splittingMemberId(world, '小宇');
  const to = splittingMemberId(world, '小安');
  const source = await callApi(world, 'POST', `/api/trips/${trip}/expenses`, {
    id: randomUUID(),
    item: '代付車票',
    amount: '300',
    currencyCode: 'TWD',
    spentOn: '2027-03-11',
    payerMemberId: to,
    shareMemberIds: [from],
  });
  expect(source.status()).toBe(201);
  await page.goto(`/trips/${trip}/repayments/new`);
  const form = page.locator('form[data-command-id]');
  await form.locator('select').nth(0).selectOption(from);
  await form.locator('select').nth(1).selectOption(to);
  await chooseCurrency(page, 'TWD', /^(幣別|currency)$/iu);
  await form.getByLabel(/^(金額|amount paid)$/iu).fill('100');
  await form.getByRole('textbox', { name: /^(還款日期|payment date)$/iu }).fill('2027/03/12');
  const id = await form.getAttribute('data-command-id');
  expect(id).toMatch(/^[0-9a-f-]{36}$/u);
  const path = `/api/trips/${trip}/repayments`;

  return { path, form, id, from, to, before: await readBrowserSplittingSnapshot(world) };
}

export async function rejectRepayment(page: Page, path: string) {
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();

    return route.fulfill({
      status: 409,
      json: { code: 'ACCOUNTING_REVISION_CONFLICT', message: '帳務版本已變更' },
    });
  });
}

export async function submitRejectedRepayment(
  page: Page,
  draft: Awaited<ReturnType<typeof arrangeRepaymentDraft>>,
) {
  const response = page.waitForResponse(
    (result) =>
      new URL(result.url()).pathname === draft.path && result.request().method() === 'POST',
  );
  await draft.form.locator('button[type=submit]').click();
  const saved = await response;
  expect(saved.status()).toBe(409);
  expect(await saved.json()).toMatchObject({ code: 'ACCOUNTING_REVISION_CONFLICT' });
  expect(saved.request().postDataJSON()).toMatchObject({ id: draft.id });
}

export async function arrangeLostResponse(
  page: Page,
  world: LedgerWorld,
  offline: boolean,
  held: boolean,
  language = 'zh-TW',
) {
  const draft = await arrangeRepaymentDraft(page, world, language);
  const { path } = draft;
  const verification = Promise.withResolvers<void>();
  const firstLookup = Promise.withResolvers<void>();
  const writes: unknown[] = [];
  const reads: string[] = [];
  let recovery = false;
  await page.route(`**${path}**`, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() === 'POST' && pathname === path) {
      writes.push(request.postDataJSON());
      const committed = await route.fetch();
      expect(committed.status()).toBe(201);
      if (offline) {
        await page.evaluate(() => {
          Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
          window.dispatchEvent(new Event('offline'));
        });
      }
      await route.abort('failed');
    } else if (request.method() === 'GET' && pathname === `${path}/${draft.id}`) {
      reads.push(pathname);
      firstLookup.resolve();
      if (held) await verification.promise;
      if (recovery) await route.continue();
      else await route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: '找不到還款' } });
    } else {
      await route.continue();
    }
  });
  page.once('close', () => verification.resolve());
  await draft.form.locator('button[type=submit]').click();
  await firstLookup.promise;
  const after = await readBrowserSplittingSnapshot(world);
  expect(after.repayments.items).toEqual([
    expect.objectContaining({
      id: draft.id,
      amount: '100.00',
      currencyCode: 'TWD',
      paidOn: '2027-03-12',
      payerMemberId: draft.from,
      payeeMemberId: draft.to,
    }),
  ]);
  for (const key of ['expenses', 'shares', 'members', 'settlements', 'adjustments'] as const)
    expect(after.sources[key]).toEqual(draft.before.sources[key]);
  const state = {
    ...draft,
    path,
    after,
    writes,
    reads,
    release: () => verification.resolve(),
    allowRecovery: () => {
      recovery = true;
    },
  };
  world.set(repaymentFixtureKey, state);

  return state;
}

export type RepaymentStatusFixture = Awaited<ReturnType<typeof arrangeLostResponse>>;

import type { Page } from '@playwright/test';
import { expect, type LedgerWorld } from './fixtures.js';
import { login, openTrip, openExpenseForm } from './browser.js';
import { seedIdentity, seedTrip, seedExpense, callApi } from '../../../api/tests/support/seed.js';

type Row = {
  id: string;
  item: string;
  amount_minor: string;
  currency_code: string;
  minor_unit: number;
  spent_on: string;
};
type Total = { currencyCode: string; amount: string; minorUnit: number };
type Expense = {
  id: string;
  item: string;
  amount: string;
  currencyCode: string;
  minorUnit: number;
  spentOn: string;
};
const state = (key: string) => `expense:${key}`;

export const amountInput = (page: Page) => page.getByLabel('金額', { exact: true });

export const dateInput = (page: Page) =>
  page.getByRole('textbox', { name: '支出日期', exact: true });
const itemInput = (page: Page) => page.getByLabel('支出項目', { exact: true });
const saveButton = (page: Page) => page.getByRole('button', { name: '儲存支出', exact: true });

export const expenseLink = (page: Page, item: string) =>
  page.getByRole('link').filter({ has: page.getByText(item, { exact: true }) });
const tripId = (world: LedgerWorld) => world.get<string>(state('tripId'));
const path = (world: LedgerWorld) => `/api/trips/${tripId(world)}/expenses`;

export function toMinor(amount: string, minorUnit: number): string {
  const [whole, fraction = ''] = amount.split('.');

  expect(fraction.length).toBeLessThanOrEqual(minorUnit);

  return (
    BigInt(whole!) * 10n ** BigInt(minorUnit) +
    BigInt(fraction.padEnd(minorUnit, '0') || '0')
  ).toString();
}

export async function rows(world: LedgerWorld): Promise<Row[]> {
  const result = await world.db.query<Row>(
    `SELECT id,item,amount_minor::text,currency_code,minor_unit,to_char(spent_on,'YYYY-MM-DD') AS spent_on FROM expenses WHERE owner_id=$1 AND trip_id=$2 ORDER BY id`,
    [world.users.get('甲')!.id, tripId(world)],
  );

  return result.rows;
}

export async function rememberRows(world: LedgerWorld) {
  world.set(state('before'), await rows(world));
}

export async function unchanged(world: LedgerWorld) {
  expect(await rows(world)).toEqual(world.get<Row[]>(state('before')));
}

export async function readLedger(world: LedgerWorld) {
  const listResponse = await callApi(world, 'GET', `${path(world)}?limit=100`);

  expect(listResponse.status()).toBe(200);
  const list = (await listResponse.json()) as {
    items: Expense[];
    totalCount: number;
    nextCursor: string | null;
  };
  const totalsResponse = await callApi(world, 'GET', `/api/trips/${tripId(world)}/totals`);

  expect(totalsResponse.status()).toBe(200);
  const { totals } = (await totalsResponse.json()) as { totals: Total[] };
  const stored = await rows(world);

  expect(list.totalCount).toBe(stored.length);
  expect(list.items).toHaveLength(stored.length);
  expect(list.items.map((x) => x.id).sort()).toEqual(stored.map((x) => x.id).sort());
  for (const expense of list.items) {
    const row = stored.find((x) => x.id === expense.id);

    expect(row, `API expense ${expense.id} exists in authoritative database`).toBeDefined();
    expect(row!.amount_minor).toBe(toMinor(expense.amount, expense.minorUnit));
    expect(row!.currency_code).toBe(expense.currencyCode);
    expect(row!.minor_unit).toBe(expense.minorUnit);
    expect(row!.item).toBe(expense.item);
    expect(row!.spent_on).toBe(expense.spentOn);
  }
  const grouped = new Map<string, { minorUnit: number; value: bigint }>();
  for (const row of stored) {
    const prior = grouped.get(row.currency_code);
    const scale = Math.max(prior?.minorUnit ?? 0, row.minor_unit);
    const value =
      (prior?.value ?? 0n) * 10n ** BigInt(scale - (prior?.minorUnit ?? 0)) +
      BigInt(row.amount_minor) * 10n ** BigInt(scale - row.minor_unit);

    grouped.set(row.currency_code, { minorUnit: scale, value });
  }
  expect(totals.map((total) => total.currencyCode).sort()).toEqual([...grouped.keys()].sort());
  for (const total of totals) {
    const expected = grouped.get(total.currencyCode)!;

    expect(total.minorUnit).toBe(expected.minorUnit);
    expect(toMinor(total.amount, total.minorUnit)).toBe(expected.value.toString());
  }

  return { list, totals, stored };
}

export async function arrangeTrip(world: LedgerWorld) {
  await seedIdentity(world, '甲');
  const trip = await seedTrip(world, '日本旅行');

  world.set(state('tripId'), trip.id);

  return trip;
}

export async function seedLedger(
  page: Page,
  world: LedgerWorld,
  jpyFood: string,
  includeFlight = true,
) {
  await arrangeTrip(world);
  if (includeFlight)
    await seedExpense(world, {
      tripName: '日本旅行',
      item: '機票',
      amount: '8000',
      currencyCode: 'TWD',
    });

  await seedExpense(world, {
    tripName: '日本旅行',
    item: '住宿',
    amount: '15000',
    currencyCode: 'JPY',
  });
  await seedExpense(world, {
    tripName: '日本旅行',
    item: '餐費',
    amount: jpyFood,
    currencyCode: 'JPY',
  });
  await readLedger(world);
  await login(page, world);
  await openTrip(page, world);
  await rememberRows(world);
}

export async function chooseCurrency(page: Page, code: string) {
  const combo = page.getByRole('combobox', { name: '幣別', exact: true });

  await combo.fill(code);
  await page
    .getByRole('option')
    .filter({ hasText: new RegExp(`^${code}\\b`) })
    .click();
  await expect(combo).toHaveValue(new RegExp(`^${code}\\b`));
}

export async function draft(
  page: Page,
  world: LedgerWorld,
  item = '午餐',
  amount = '1200',
  currency = 'JPY',
) {
  await arrangeTrip(world);
  await readLedger(world);
  await login(page, world);
  await openExpenseForm(page, world);
  await itemInput(page).fill(item);
  await chooseCurrency(page, currency);
  await amountInput(page).fill(amount);
  world.set(state('draft'), { item, amount, currency });
  world.set(state('posts'), []);
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === path(world)) {
      const posts = world.get<Record<string, unknown>[]>(state('posts'));

      posts.push(request.postDataJSON() as Record<string, unknown>);
    }
  });
  await rememberRows(world);
}

export async function assertDraft(page: Page, world: LedgerWorld) {
  const expected = world.get<{ item: string; amount: string; currency: string }>(state('draft'));

  await expect(itemInput(page)).toHaveValue(expected.item);
  await expect(amountInput(page)).toHaveValue(expected.amount);
  await expect(page.getByRole('combobox', { name: '幣別', exact: true })).toHaveValue(
    new RegExp(`^${expected.currency}\\b`),
  );
}

export async function noCreation(world: LedgerWorld) {
  expect(world.get<unknown[]>(state('posts'))).toEqual([]);
  await unchanged(world);
  await readLedger(world);
}

export async function save(page: Page, world: LedgerWorld) {
  // The next assertion distinguishes a valid draft from a missing form before an Act.
  await expect(saveButton(page)).toBeEnabled();
  await saveButton(page).click();
  if (
    !world.state.has(state('offline')) &&
    world.state.get(state('unknown')) !== 'unverified' &&
    world.get<{ amount: string }>(state('draft')).amount !== '0'
  ) {
    await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  } else {
    await expect(page.getByText(/尚未保存|尚未確認|大於零|正數/).first()).toBeVisible();
  }
}

export async function edit(
  page: Page,
  world: LedgerWorld,
  item: string,
  amount: string,
  currency?: string,
) {
  await expenseLink(page, item).click();
  if (currency) await chooseCurrency(page, currency);

  await amountInput(page).fill(amount);
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'PATCH' && new URL(r.url()).pathname.startsWith(`${path(world)}/`),
  );

  await saveButton(page).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
}

function displayedAmount(amount: string) {
  const [whole, fraction] = amount.split('.');
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return new RegExp(
    `(?<![\\d.,])${grouped.replace(/,/g, ',?')}${fraction && /[1-9]/.test(fraction) ? `\\.${fraction}` : '(?:\\.00)?'}(?![\\d.])`,
  );
}

export async function assertTotal(
  page: Page,
  world: LedgerWorld,
  currencyCode: string,
  amount: string,
) {
  const { totals, stored } = await readLedger(world);
  const total = totals.find((x) => x.currencyCode === currencyCode);

  expect(total, `${currencyCode} total from authoritative endpoint`).toBeDefined();
  expect(toMinor(total!.amount, total!.minorUnit)).toBe(toMinor(amount, total!.minorUnit));
  const sum = stored
    .filter((x) => x.currency_code === currencyCode)
    .reduce(
      (n, x) => n + BigInt(x.amount_minor) * 10n ** BigInt(total!.minorUnit - x.minor_unit),
      0n,
    );

  expect(sum.toString()).toBe(toMinor(total!.amount, total!.minorUnit));
  const summary = page.getByRole('region', { name: '分幣別總額', exact: true });
  const card = summary.getByRole('group', { name: currencyCode, exact: true });

  await expect(card).toContainText(displayedAmount(amount));
}

export async function assertExpense(
  page: Page,
  world: LedgerWorld,
  item: string,
  amount: string,
  currencyCode: string,
) {
  const { list, stored } = await readLedger(world);
  const matches = list.items.filter((x) => x.item === item);

  expect(matches).toHaveLength(1);
  expect(matches[0]!.currencyCode).toBe(currencyCode);
  expect(matches[0]!.amount).toBe(amount);
  const row = stored.find((x) => x.id === matches[0]!.id)!;

  expect(row.amount_minor).toBe(toMinor(amount, matches[0]!.minorUnit));
  await expect(expenseLink(page, item)).toContainText(currencyCode);
  await expect(expenseLink(page, item)).toContainText(displayedAmount(amount));
}

export async function loseCreateResponse(page: Page, world: LedgerWorld, unverified: boolean) {
  await draft(page, world);
  world.set(state('unknown'), unverified ? 'unverified' : 'confirmed');
  world.set(state('probes'), []);
  await page.route('**/api/trips/*/expenses/*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();

    const id = new URL(route.request().url()).pathname.split('/').at(-1)!;

    world.get<string[]>(state('probes')).push(id);
    if (unverified)
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'TEMPORARILY_UNAVAILABLE', message: '測試查證暫不可用' }),
      });

    return route.continue();
  });
  await page.route('**/api/trips/*/expenses', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();

    const response = await route.fetch();

    expect(response.status(), 'proxy forwards creation and only loses its response').toBe(201);
    world.set(state('createdId'), (route.request().postDataJSON() as { id: string }).id);
    await route.abort('failed');
  });
}

export async function assertUnknown(page: Page, world: LedgerWorld, confirmed: boolean) {
  const posts = world.get<{ id: string }[]>(state('posts'));

  expect(posts).toHaveLength(1);
  const originalId = world.get<string>(state('createdId'));

  expect(posts[0]!.id).toBe(originalId);
  expect(world.get<string[]>(state('probes'))).toContain(originalId);
  const ledger = await readLedger(world);

  expect(ledger.stored).toHaveLength(1);
  expect(ledger.stored[0]!.id).toBe(originalId);
  if (confirmed) {
    await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
    await assertExpense(page, world, '午餐', '1200', 'JPY');
  } else {
    await expect(page.getByText(/保存結果尚未確認/)).toBeVisible();
    await assertDraft(page, world);
    await expect(saveButton(page)).toBeDisabled();
  }
}

export async function arrangePagination(page: Page, world: LedgerWorld) {
  await arrangeTrip(world);
  for (let index = 1; index <= 51; index++) {
    await seedExpense(world, {
      tripName: '日本旅行',
      item: `跨頁支出${index.toString().padStart(2, '0')}`,
      amount: index === 1 ? '9000' : '100',
      currencyCode: index === 1 ? 'TWD' : 'JPY',
      spentOn: index === 1 ? '2027-01-01' : '2027-03-11',
    });
  }
  const { list } = await readLedger(world);

  expect(list.totalCount).toBe(51);
  await login(page, world);
  await openTrip(page, world);
  await expect(page.getByRole('link').filter({ hasText: /跨頁支出\d+/ })).toHaveCount(50);
  await expect(expenseLink(page, '跨頁支出01')).toHaveCount(0);
  await assertTotal(page, world, 'TWD', '9000');
  await assertTotal(page, world, 'JPY', '5000');
  world.set(state('totalRequests'), 0);
  page.on('request', (request) => {
    if (
      request.method() === 'GET' &&
      new URL(request.url()).pathname === `/api/trips/${tripId(world)}/totals`
    )
      world.set(state('totalRequests'), world.get<number>(state('totalRequests')) + 1);
  });
  await rememberRows(world);
}

export async function fixedDate(page: Page, world: LedgerWorld, openForm: boolean) {
  await page.clock.install({ time: new Date('2027-03-11T04:00:00.000Z') });
  await arrangeTrip(world);
  await readLedger(world);
  await login(page, world);
  if (openForm) await openExpenseForm(page, world);

  await rememberRows(world);
  world.set(state('posts'), []);
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === path(world))
      world.get<unknown[]>(state('posts')).push(request.postDataJSON());
  });
}

export async function checkInput(page: Page, world: LedgerWorld, expected: string) {
  await expect(amountInput(page)).toHaveValue(expected);
  await noCreation(world);
}

export async function deleteLodging(page: Page, world: LedgerWorld) {
  await expenseLink(page, '住宿').click();
  await page.getByRole('button', { name: '刪除支出', exact: true }).click();
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'DELETE' && new URL(r.url()).pathname.startsWith(`${path(world)}/`),
  );

  await page.getByRole('dialog').getByRole('button', { name: '確認刪除', exact: true }).click();
  expect((await response).status()).toBe(204);
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
}

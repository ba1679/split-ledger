import { randomUUID } from 'node:crypto';
import { expect, type Locator, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import {
  seedLifecycleBaseline,
  managementTripId,
  managementSnapshot,
  sharedSnapshot,
} from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import type { ExpenseList, PersonalCurrencyTotal } from '../../../src/api/index.js';
import { login } from '../browser.js';
import {
  observeManagement,
  managementUI,
  waitForManagementReads,
} from '../trips/management-fixture.js';
import { responseProxyControls, type ResponseProxyControl } from './response-proxy.js';

export interface PaginationRead {
  tripId: string;
  first: ExpenseList;
  second: ExpenseList;
  cursor: string;
  before: TripManagementSnapshot;
  untouched: { id: string; before: TripManagementSnapshot };
  totalsText: string;
  originalRows: string[];
  control: Locator;
  box?: { x: number; y: number; width: number; height: number };
  requests: Request[];
  arrived: number;
  finished: number;
  released: boolean;
  errors: unknown[];
  release(): void;
  dispose(): Promise<void>;
}

export function expenseRows(page: Page, tripId: string): Locator {
  return page.locator(`a[href^="/trips/${tripId}/expenses/"]:not([href$="/new"])`);
}

export async function visibleExpenseIds(page: Page, tripId: string): Promise<string[]> {
  return expenseRows(page, tripId).evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('href')!.split('/').at(-1)!),
  );
}

export async function assertPaginationDataUnchanged(world: LedgerWorld): Promise<void> {
  const state = world.get<PaginationRead>('loading:pagination');
  expect(await managementSnapshot(world)).toEqual(state.before);
  expect(await managementSnapshot(world, state.untouched.id)).toEqual(state.untouched.before);
  await assertOtherDataUnchanged(world);
}

export async function arrangePagination(page: Page, world: LedgerWorld): Promise<void> {
  await seedLifecycleBaseline(world, '一般可用');
  const untouched = { id: managementTripId(world), before: await managementSnapshot(world) };
  const tripId = randomUUID(),
    amyId = randomUUID(),
    owner = world.users.get('Alice')!.id;
  const created = await callApi(
    world,
    'POST',
    '/api/trips',
    { id: tripId, name: '日本旅行', startDate: '2027-03-01', endDate: '2027-03-31' },
    'Alice',
  );
  expect(created.status()).toBe(201);
  const trip = await created.json();
  const member = await callApi(
    world,
    'POST',
    `/api/trips/${tripId}/members`,
    { id: amyId, name: 'Amy' },
    'Alice',
  );
  expect(member.status()).toBe(201);
  const client = await world.db.connect();
  try {
    await client.query('BEGIN');
    for (let index = 1; index <= 25; index++) {
      const expenseId = randomUUID(),
        jpy = index <= 20;
      await client.query(
        'INSERT INTO expenses(id,owner_id,trip_id,payer_member_id,item,amount_minor,currency_code,minor_unit,spent_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [
          expenseId,
          owner,
          tripId,
          trip.ownerMemberId,
          `分頁支出${String(index).padStart(2, '0')}`,
          jpy ? '100' : '20000',
          jpy ? 'JPY' : 'TWD',
          jpy ? 0 : 2,
          `2027-03-${String(index).padStart(2, '0')}`,
        ],
      );
      for (const memberId of [trip.ownerMemberId, amyId])
        await client.query(
          'INSERT INTO expense_shares(owner_id,trip_id,expense_id,member_id) VALUES($1,$2,$3,$4)',
          [owner, tripId, expenseId, memberId],
        );
    }
    await client.query('UPDATE trips SET accounting_revision=25 WHERE id=$1', [tripId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  world.tripManagement.ids.trips.set('日本旅行', tripId);
  world.splitting.ids.trips.set('日本旅行', tripId);
  world.splitting.ids.members.set('Alice', trip.ownerMemberId);
  world.splitting.ids.members.set('Amy', amyId);
  const before = await managementSnapshot(world);
  expect(before.expenses.length).toBe(25);
  expect(before.shares.length).toBe(50);
  const gross = await world.db.query(
    'SELECT currency_code,sum(amount_minor)::text AS amount FROM expenses WHERE trip_id=$1 GROUP BY currency_code ORDER BY currency_code',
    [tripId],
  );
  expect(gross.rows).toEqual([
    { currency_code: 'JPY', amount: '2000' },
    { currency_code: 'TWD', amount: '100000' },
  ]);
  const base = `/api/trips/${tripId}/expenses`;
  const firstResponse = await ownerRead(world, base);
  expect(firstResponse.status()).toBe(200);
  const first = (await firstResponse.json()) as ExpenseList;
  expect(first.items.length).toBe(20);
  expect(first.totalCount).toBe(25);
  expect(first.nextCursor).not.toBeNull();
  const cursor = first.nextCursor!;
  const secondResponse = await ownerRead(world, `${base}?cursor=${encodeURIComponent(cursor)}`);
  expect(secondResponse.status()).toBe(200);
  const second = (await secondResponse.json()) as ExpenseList;
  expect(second.items.length).toBe(5);
  expect(second.totalCount).toBe(25);
  expect(second.nextCursor).toBeNull();
  expect([...first.items, ...second.items].map((expense) => expense.id).sort()).toEqual(
    before.expenses.map((expense) => String(expense.id)).sort(),
  );
  const totals = await ownerRead(world, `/api/trips/${tripId}/totals?scope=personal`);
  expect(totals.status()).toBe(200);
  const amounts = (await totals.json()).totals as PersonalCurrencyTotal[];
  expect(amounts.length).toBe(2);
  for (const [code, numerator, minorUnit] of [
    ['JPY', '1000', 0],
    ['TWD', '50000', 2],
  ] as const)
    expect(
      independentSplittingOracle.equal(
        amounts.find((total) => total.currencyCode === code)!.amount,
        { numerator, denominator: '1', minorUnit },
      ),
    ).toBe(true);
  await login(page, world, 'Alice');
  observeManagement(page, world, 'pagination');
  await page.goto(`/trips/${tripId}`);
  await expect(expenseRows(page, tripId)).toHaveCount(20);
  expect(await visibleExpenseIds(page, tripId)).toEqual(first.items.map((expense) => expense.id));
  const totalsRegion = page.getByRole('region', { name: '分幣別總額', exact: true });
  await expect(totalsRegion.getByRole('group', { name: 'JPY', exact: true })).toContainText(
    '1,000',
  );
  await expect(totalsRegion.getByRole('group', { name: 'TWD', exact: true })).toContainText(
    '500.00',
  );
  await waitForManagementReads(managementUI(world));
  world.set('management:before', before);
  world.set('management:sharedBefore', await sharedSnapshot(world));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const match = (url: URL) => url.pathname === base && url.searchParams.get('cursor') === cursor;
  const state: PaginationRead = {
    tripId,
    first,
    second,
    cursor,
    before,
    untouched,
    totalsText: await totalsRegion.innerText(),
    originalRows: await expenseRows(page, tripId).allTextContents(),
    control: page.getByRole('button', { name: '載入更多', exact: true }),
    requests: [],
    arrived: 0,
    finished: 0,
    released: false,
    errors: [],
    release() {
      state.released = true;
      release();
    },
    async dispose() {
      state.release();
      try {
        await expect.poll(() => state.finished).toBe(state.arrived);
      } finally {
        controls.delete(proxy);
        page.off('request', onRequest);
      }
      expect(state.errors.map(String)).toEqual([]);
    },
  };
  const onRequest = (request: Request) => {
    if (request.method() === 'GET' && match(new URL(request.url()))) state.requests.push(request);
  };
  const proxy: ResponseProxyControl = {
    matches: (request) =>
      request.method === 'GET' && match(new URL(request.url!, 'http://test.invalid')),
    async handle(exchange) {
      state.arrived++;
      try {
        expect(exchange.status).toBe(200);
        expect(JSON.parse(exchange.body.toString())).toEqual(second);
        await gate;

        return 'forward';
      } finally {
        state.finished++;
      }
    },
    failed(error) {
      state.errors.push(error);
    },
  };
  page.on('request', onRequest);
  controls.add(proxy);
  world.tripManagement.cleanups.add(state.dispose);
  await expect(state.control).toBeEnabled();
  expect(state.arrived).toBe(0);
  expect(managementUI(world).writes.length).toBe(0);
  world.set('loading:pagination', state);
  await assertPaginationDataUnchanged(world);
}

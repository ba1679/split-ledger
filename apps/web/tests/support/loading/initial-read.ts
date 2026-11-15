import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import {
  seedLifecycleBaseline,
  managementTripId,
  managementSnapshot,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { assertMemberBalanceProjection } from '../../../../api/tests/support/splitting/member-balances-result.js';
import { disconnectLoadedPage } from './offline-network.js';
import { waitForManagementReads } from '../trips/management-fixture.js';
import { login } from '../browser.js';
import { observeManagement, managementUI } from '../trips/management-fixture.js';
import {
  liveQueryAttempts,
  queryAttempts,
  isCancelledRead,
  connectedQueryExchanges,
} from './query-attempts.js';
import {
  responseProxyControls,
  type ProxyExchange,
  type ResponseProxyControl,
} from './response-proxy.js';

export interface InitialRead {
  screen: string;
  content: string;
  result: string;
  route: string;
  query: string;
  layout: 'cards' | 'list' | 'form' | 'summary';
  before: TripManagementSnapshot;
  authority: unknown;
  exchanges: ProxyExchange[];
  errors: unknown[];
  release(): void;
  released: boolean;
  finished: number;
}

export async function arrangeInitialRead(
  page: Page,
  world: LedgerWorld,
  screen: string,
  content: string,
  result: string,
): Promise<void> {
  expect(['延遲', '成功', '成功空', '明確失敗', '無網路']).toContain(result);
  await seedLifecycleBaseline(
    world,
    screen === '垃圾桶' && result !== '成功空' ? '垃圾桶' : '一般可用',
  );
  const tripId = managementTripId(world),
    base = `/api/trips/${tripId}`;
  const expenseId = world.splitting.ids.expenses.get('晚餐')!;
  const before = await managementSnapshot(world);
  const config: Record<string, [string, string, InitialRead['layout']]> = {
    '新增支出/幣別': [`/trips/${tripId}/expenses/new`, '/api/currencies', 'form'],
    '新增支出/分類': [`/trips/${tripId}/expenses/new`, '/api/categories', 'form'],
    '新增支出/分攤成員': [`/trips/${tripId}/expenses/new`, `${base}/members`, 'form'],
    '旅行清單/一般旅行': ['/trips', '/api/trips', 'cards'],
    '垃圾桶/已移入垃圾桶的旅行': ['/trips/trash', '/api/trips/trash', 'cards'],
    '旅行帳本/旅行資料': [`/trips/${tripId}`, base, 'summary'],
    '旅行帳本/各幣別總額': [`/trips/${tripId}`, `${base}/totals?scope=personal`, 'summary'],
    '旅行帳本/支出清單': [`/trips/${tripId}`, `${base}/expenses`, 'list'],
    '既有支出詳情/該筆支出與分攤': [
      `/trips/${tripId}/expenses/${expenseId}`,
      `${base}/expenses/${expenseId}`,
      'form',
    ],
    '支出編輯表單/既有支出表單資料': [
      `/trips/${tripId}/expenses/${expenseId}`,
      `${base}/expenses/${expenseId}`,
      'form',
    ],
    '分類管理/分類清單': ['/categories', '/api/categories', 'list'],
    '同行者管理/同行者清單': [`/trips/${tripId}/members`, `${base}/members`, 'list'],
    '分帳畫面/付款安排': [`/trips/${tripId}/settlement`, `${base}/settlement`, 'list'],
    '獨立還款表單/還款所需旅行與成員資料': [
      `/trips/${tripId}/repayments/new`,
      `${base}/members`,
      'form',
    ],
    '實付結清表單/目前待結清安排': [
      `/trips/${tripId}/settlements/new`,
      `${base}/settlement`,
      'form',
    ],
  };
  const selected = config[`${screen}/${content}`];
  expect(selected, 'Only the truth Examples page/content pairs are supported').toBeDefined();
  const [route, query, layout] = selected!;
  let target = route;
  if (screen !== '垃圾桶') {
    const settlement = await ownerRead(world, `${base}/settlement`);
    expect(settlement.status()).toBe(200);
    const view = await settlement.json();
    assertMemberBalanceProjection(
      before,
      view,
      before.members.flatMap((member) =>
        ['JPY', 'TWD'].map((currency) => ({
          成員: String(member.name),
          幣別: currency,
          淨額:
            currency === 'JPY'
              ? '0'
              : member.name === 'Alice'
                ? '300'
                : member.name === 'Amy'
                  ? '-300'
                  : '0',
        })),
      ),
      (name) => String(before.members.find((member) => member.name === name)!.id),
    );
    expect(view.arrangements.length).toBeGreaterThan(0);
    if (screen === '實付結清表單')
      target += `?arrangementKey=${encodeURIComponent(view.arrangements[0].key)}`;
  }
  const authoritative = await ownerRead(world, query);
  expect(authoritative.status()).toBe(200);
  const authority = await authoritative.json();
  if (result === '成功空') {
    expect(screen).toBe('垃圾桶');
    expect(authority.items).toEqual([]);
  } else if (
    ['旅行清單', '垃圾桶', '分類管理', '同行者管理'].includes(screen) ||
    content === '支出清單'
  )
    expect(authority.items.length).toBeGreaterThan(0);
  else if (screen === '新增支出') expect(authority.items.length).toBeGreaterThan(0);
  else if (screen.includes('支出'))
    expect(authority).toMatchObject({
      id: expenseId,
      item: '晚餐',
      amount: '3000',
      currencyCode: 'JPY',
    });
  else if (content === '各幣別總額') expect(authority.totals.length).toBeGreaterThan(0);
  await login(page, world, 'Alice');
  await page.goto('about:blank');
  // Retain every native attempt, including StrictMode GET cancellation; later steps
  // distinguish that recorded cancellation from the original live query and any retry.
  observeManagement(page, world, 'initial-read');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const state: InitialRead = {
    screen,
    content,
    result,
    route: target,
    query,
    layout,
    before,
    authority,
    exchanges: [],
    errors: [],
    released: false,
    finished: 0,
    release() {
      state.released = true;
      release();
    },
  };
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const control: ResponseProxyControl = {
    matches(request) {
      const url = new URL(request.url!, 'http://test.invalid');

      return (
        !state.released && request.method === 'GET' && `${url.pathname}${url.search}` === query
      );
    },
    async handle(exchange) {
      state.exchanges.push(exchange);
      try {
        expect(exchange.status).toBe(200);
        expect(JSON.parse(exchange.body.toString())).toEqual(authority);
        await gate;

        return result === '明確失敗' ? 'drop' : 'forward';
      } finally {
        state.finished++;
      }
    },
    failed(error) {
      state.errors.push(error);
    },
  };
  controls.add(control);
  world.tripManagement.cleanups.add(async () => {
    state.release();
    try {
      await expect.poll(() => state.finished).toBe(state.exchanges.length);
    } finally {
      controls.delete(control);
      await page.context().setOffline(false);
    }
    expect(state.errors.map(String)).toEqual([]);
  });
  if (result === '無網路') {
    expect(screen).toBe('旅行清單');
    // Boot another private route first: no trip-list query or cached result exists.
    await page.goto('/categories');
    await expect(page.getByRole('button', { name: '新增分類', exact: true })).toBeVisible();
    await expect(page.getByText('餐飲', { exact: true })).toBeVisible();
    await waitForManagementReads(managementUI(world));
    expect(queryAttempts(managementUI(world), query).length).toBe(0);
    await disconnectLoadedPage(page);
  }
  world.set('loading:initial', state);
}

/** Confirm that the one live browser query, rather than its cancelled predecessor, is held. */
export async function awaitInitialReadHeld(world: LedgerWorld): Promise<void> {
  const state = world.get<InitialRead>('loading:initial'),
    ui = managementUI(world);
  await expect.poll(() => connectedQueryExchanges(state.exchanges).length).toBe(1);
  await expect.poll(() => liveQueryAttempts(ui, state.query).length).toBe(1);
  expect(queryAttempts(ui, state.query).filter(isCancelledRead).length).toBeLessThanOrEqual(1);
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  expect(state.errors.map(String)).toEqual([]);
}

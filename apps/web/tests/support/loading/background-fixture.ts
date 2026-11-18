import { expect, type Locator, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import type { ExpenseList } from '../../../src/api/index.js';
import { arrangePagination, expenseRows, type PaginationRead } from './pagination-fixture.js';
import { loadMore } from './load-more.js';
import { repeatPagination } from './repeat-pagination.js';
import { assertPaginationComplete } from './pagination-result.js';
import {
  responseProxyControls,
  type ProxyExchange,
  type ResponseProxyControl,
} from './response-proxy.js';
import { managementUI } from '../trips/management-fixture.js';

export interface BackgroundRead {
  result: string;
  pagination: PaginationRead;
  before: TripManagementSnapshot;
  expectedPages: ExpenseList[];
  originalIds: string[];
  originalText: string[];
  totalsText: string;
  focus: Locator;
  requests: Request[];
  exchanges: ProxyExchange[];
  errors: unknown[];
  finished: number;
  released: boolean;
  triggered: boolean;
  release(): void;
  dispose(): Promise<void>;
}

export async function arrangeBackgroundRead(
  page: Page,
  world: LedgerWorld,
  result: string,
): Promise<void> {
  expect(['延遲', '明確失敗', '成功']).toContain(result);
  await arrangePagination(page, world);
  await loadMore(world);
  await repeatPagination(world);
  await assertPaginationComplete(world);
  const pagination = world.get<PaginationRead>('loading:pagination');
  // assertPaginationComplete removed the old cursor control; background reads remain real refetches.
  const focus = expenseRows(page, pagination.tripId).first();
  await focus.focus();
  await expect(focus).toBeFocused();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const state: BackgroundRead = {
    result,
    pagination,
    before: pagination.before,
    expectedPages: [pagination.first, pagination.second],
    originalIds: [...pagination.first.items, ...pagination.second.items].map(
      (expense) => expense.id,
    ),
    originalText: await expenseRows(page, pagination.tripId).allTextContents(),
    totalsText: pagination.totalsText,
    focus,
    requests: [],
    exchanges: [],
    errors: [],
    finished: 0,
    released: false,
    triggered: false,
    release() {
      state.released = true;
      release();
    },
    async dispose() {
      state.release();
      try {
        await expect.poll(() => state.finished).toBe(state.exchanges.length);
      } finally {
        controls.delete(proxy);
        page.off('request', onRequest);
      }
      expect(state.errors.map(String)).toEqual([]);
    },
  };
  const path = `/api/trips/${pagination.tripId}/expenses`;
  const onRequest = (request: Request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === path)
      state.requests.push(request);
  };
  const proxy: ResponseProxyControl = {
    matches: (request) =>
      request.method === 'GET' && new URL(request.url!, 'http://test.invalid').pathname === path,
    async handle(exchange) {
      state.exchanges.push(exchange);
      try {
        expect(exchange.status).toBe(200);
        const body = JSON.parse(exchange.body.toString()) as ExpenseList;
        const expected = state.expectedPages.find(
          (expectedPage) => expectedPage.items[0]!.id === body.items[0]!.id,
        );
        expect(expected).toBeDefined();
        expect(body).toEqual(expected);
        await gate;

        // A real completed read is truncated on the wire; no fabricated status/data enters the app.
        return state.result === '明確失敗' ? 'drop' : 'forward';
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
  expect(state.requests.length).toBe(0);
  expect(managementUI(world).writes.length).toBe(0);
  world.set('loading:background', state);
}

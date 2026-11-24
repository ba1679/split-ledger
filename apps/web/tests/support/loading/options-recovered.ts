import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';
import { arrangeOperationData, type OperationData } from './operation-data.js';
import {
  responseProxyControls,
  type ProxyExchange,
  type ResponseProxyControl,
} from './response-proxy.js';
import { connectedQueryExchanges } from './query-attempts.js';

export interface RecoveredOptions {
  data: OperationData;
  before: Awaited<ReturnType<typeof managementSnapshot>>;
  authorities: Record<string, { items: Record<string, unknown>[] }>;
  requests: Request[];
  exchanges: ProxyExchange[];
  errors: unknown[];
  finished: number;
  savedId?: string;
  savedBody?: Record<string, unknown>;
}

export async function assertRecoveredDraft(world: LedgerWorld): Promise<void> {
  const page = managementUI(world).page;
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue('點心');
  await expect(page.getByLabel('支出金額', { exact: true })).toHaveValue('100');
  await expect(page.getByRole('textbox', { name: '支出日期', exact: true })).toHaveValue(
    '2027/03/11',
  );
  await expect(page.getByRole('combobox', { name: '幣別', exact: true })).toHaveValue(/^JPY\b/);
  await expect(page.getByRole('combobox', { name: /^分類(?:選填)?$/ })).toHaveValue('餐飲');
  await expect(page.getByRole('radio', { name: 'Alice', exact: true })).toBeChecked();
  expect(
    await page
      .locator('input[type="checkbox"]:checked')
      .evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).value).sort(),
      ),
  ).toEqual(
    [world.splitting.ids.members.get('Alice'), world.splitting.ids.members.get('Amy')].sort(),
  );
}

export async function arrangeRecoveredOptions(page: Page, world: LedgerWorld): Promise<void> {
  // Preserve a complete legal draft across real delayed re-reads of all three option queries.
  // Initial-read-only loading is independently covered by T185–T187.
  const data = await arrangeOperationData(page, world, '新增支出');
  const ui = managementUI(world),
    paths = ['/api/currencies', '/api/categories', `/api/trips/${data.tripId}/members`];
  const state: RecoveredOptions = {
    data,
    before: await managementSnapshot(world),
    authorities: {},
    requests: [],
    exchanges: [],
    errors: [],
    finished: 0,
  };
  for (const path of paths) {
    const response = await ownerRead(world, path);
    expect(response.status()).toBe(200);
    state.authorities[path] = await response.json();
    expect(state.authorities[path]!.items.length).toBeGreaterThan(0);
  }
  await assertRecoveredDraft(world);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const control: ResponseProxyControl = {
    matches: (request) =>
      request.method === 'GET' &&
      paths.includes(new URL(request.url!, 'http://test.invalid').pathname),
    async handle(exchange) {
      state.exchanges.push(exchange);
      try {
        expect(exchange.status).toBe(200);
        const path = new URL(exchange.path, 'http://test.invalid').pathname;
        expect(JSON.parse(exchange.body.toString())).toEqual(state.authorities[path]);
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
  controls.add(control);
  const readStart = ui.reads.length;
  world.tripManagement.cleanups.add(async () => {
    release();
    try {
      await expect.poll(() => state.finished).toBe(state.exchanges.length);
    } finally {
      controls.delete(control);
    }
    expect(state.errors.map(String)).toEqual([]);
  });
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(() => connectedQueryExchanges(state.exchanges).length).toBe(3);
  state.requests = ui.reads
    .slice(readStart)
    .filter((request) => paths.includes(new URL(request.url()).pathname));
  expect(state.requests.length).toBe(3);
  for (const path of paths)
    expect(
      state.requests.filter((request) => new URL(request.url()).pathname === path).length,
    ).toBe(1);
  expect(state.finished).toBe(0);
  await assertRecoveredDraft(world);
  release();
  for (const request of state.requests) {
    const response = await request.response();
    expect(response?.status()).toBe(200);
    expect(await response!.finished()).toBeNull();
    expect(await response!.json()).toEqual(state.authorities[new URL(request.url()).pathname]);
  }
  await expect.poll(() => state.finished).toBe(3);
  controls.delete(control);
  await waitForManagementReads(ui);
  await assertRecoveredDraft(world);
  await expect(data.control).toBeEnabled();
  expect(ui.writes.length).toBe(0);
  expect(await managementSnapshot(world)).toEqual(state.before);
  await assertOtherDataUnchanged(world);
  world.set('loading:recoveredOptions', state);
}

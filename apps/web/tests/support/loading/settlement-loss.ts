import { isCancelledRead } from './query-attempts.js';
import { expect, type Page, type Request, type Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { assertMemberBalanceProjection } from '../../../../api/tests/support/splitting/member-balances-result.js';
import type {
  SettleArrangementRequest,
  SettlementRecord,
} from '../../../src/features/settlement/types.js';
import { arrangeOperationData, type OperationData } from './operation-data.js';
import { omitFields } from './operation-business-result.js';
import { managementUI } from '../trips/management-fixture.js';
import {
  responseProxyControls,
  type ProxyExchange,
  type ResponseProxyControl,
} from './response-proxy.js';

export interface SettlementLoss {
  data: OperationData;
  before: TripManagementSnapshot;
  after?: TripManagementSnapshot;
  command?: SettleArrangementRequest;
  committed?: SettlementRecord;
  amount: string;
  date: string;
  arrangement: { key: string; accountingRevision: string };
  writes: Request[];
  exchanges: ProxyExchange[];
  proofReads: { request: Request; path: string; mode: string }[];
  proofMode: 'hold' | 'fail' | 'available';
  pendingProofs: number;
  finished: number;
  errors: unknown[];
  releaseProofs(): void;
}

async function assertCommitted(
  world: LedgerWorld,
  state: SettlementLoss,
  record: SettlementRecord,
): Promise<void> {
  const command = state.command!,
    before = state.before,
    after = await managementSnapshot(world);
  expect(record).toMatchObject({
    id: command.id,
    tripId: state.data.tripId,
    sourceRevision: command.accountingRevision,
    arrangementKey: command.arrangementKey,
    debtorMemberId: command.debtorMemberId,
    creditorMemberId: command.creditorMemberId,
    currencyCode: 'JPY',
    obligation: { numerator: '100', denominator: '1', minorUnit: 0 },
    repayment: {
      id: command.repaymentId,
      amount: '100',
      paidOn: '2027-03-12',
      kind: 'settlement',
      settlementId: command.id,
    },
  });
  for (const key of [
    'members',
    'expenses',
    'shares',
    'thumbnails',
    'reservations',
    'receipts',
    'categories',
  ] as const)
    expect(after[key]).toEqual(before[key]);
  expect(after.settlements.filter((row) => row.id !== command.id)).toEqual(before.settlements);
  expect(after.repayments.filter((row) => row.id !== command.repaymentId)).toEqual(
    before.repayments,
  );
  expect(after.adjustments.filter((row) => row.settlement_id !== command.id)).toEqual(
    before.adjustments,
  );
  const events = after.settlements.filter((row) => row.id === command.id),
    payments = after.repayments.filter((row) => row.id === command.repaymentId),
    adjustments = after.adjustments.filter((row) => row.settlement_id === command.id);
  expect(events.length).toBe(1);
  expect(payments.length).toBe(1);
  expect(adjustments.length).toBe(2);
  expect(events[0]).toMatchObject({
    trip_id: state.data.tripId,
    owner_id: world.users.get('Alice')!.id,
    source_revision: command.accountingRevision,
    debtor_member_id: command.debtorMemberId,
    creditor_member_id: command.creditorMemberId,
    obligation_numerator: '100',
    obligation_denominator: '1',
    obligation_minor_unit: 0,
  });
  expect(payments[0]).toMatchObject({
    trip_id: state.data.tripId,
    owner_id: world.users.get('Alice')!.id,
    amount_minor: '100',
    currency_code: 'JPY',
    minor_unit: 0,
    kind: 'settlement',
    settlement_id: command.id,
    payer_member_id: command.debtorMemberId,
    payee_member_id: command.creditorMemberId,
  });
  expect(adjustments.map((row) => row.member_id).sort()).toEqual(
    [command.debtorMemberId, command.creditorMemberId].sort(),
  );
  for (const row of adjustments) {
    expect(String(row.numerator)).toBe('0');
    expect(BigInt(String(row.denominator)) > 0n).toBe(true);
  }
  expect(omitFields(after.trips[0]!, ['accounting_revision', 'updated_at'])).toEqual(
    omitFields(before.trips[0]!, ['accounting_revision', 'updated_at']),
  );
  expect(String(after.trips[0]!.accounting_revision)).toBe(
    String(BigInt(String(before.trips[0]!.accounting_revision)) + 1n),
  );
  const proof = await ownerRead(world, `${state.data.path}/${command.id}`);
  expect(proof.status()).toBe(200);
  expect(await proof.json()).toEqual(record);
  const payment = await ownerRead(
    world,
    `/api/trips/${state.data.tripId}/repayments/${command.repaymentId}`,
  );
  expect(payment.status()).toBe(200);
  expect(await payment.json()).toEqual(record.repayment);
  const balances = await ownerRead(world, `/api/trips/${state.data.tripId}/settlement`);
  expect(balances.status()).toBe(200);
  const view = await balances.json();
  assertMemberBalanceProjection(
    after,
    view,
    [
      { 成員: 'Alice', 幣別: 'JPY', 淨額: '0' },
      { 成員: 'Amy', 幣別: 'JPY', 淨額: '0' },
    ],
    (name) => String(after.members.find((member) => member.name === name)!.id),
  );
  expect(view.arrangements).toEqual([]);
  const untouched = world.get<{ id: string; before: TripManagementSnapshot }>(
    'loading:untouchedTrip',
  );
  expect(await managementSnapshot(world, untouched.id)).toEqual(untouched.before);
  await assertOtherDataUnchanged(world);
  state.after = after;
  state.committed = record;
}

export async function arrangeSettlementLoss(page: Page, world: LedgerWorld): Promise<void> {
  const data = await arrangeOperationData(page, world, '保存實付結清');
  const before = await managementSnapshot(world);
  const view = await ownerRead(world, `/api/trips/${data.tripId}/settlement`);
  expect(view.status()).toBe(200);
  const current = await view.json();
  expect(current.arrangements.length).toBe(1);
  expect(current.arrangements[0].amount).toEqual({
    numerator: '100',
    denominator: '1',
    minorUnit: 0,
  });
  let releaseProofs!: () => void;
  const proofGate = new Promise<void>((resolve) => {
    releaseProofs = resolve;
  });
  const state: SettlementLoss = {
    data,
    before,
    amount: await page.getByLabel('實付金額', { exact: true }).inputValue(),
    date: await page.getByRole('textbox', { name: '結清日期', exact: true }).inputValue(),
    arrangement: {
      key: current.arrangements[0].key,
      accountingRevision: current.accountingRevision,
    },
    writes: [],
    exchanges: [],
    proofReads: [],
    proofMode: 'hold',
    pendingProofs: 0,
    finished: 0,
    errors: [],
    releaseProofs,
  };
  expect(state.amount).toBe('100');
  expect(state.date).toBe('2027/03/12');
  const onRequest = (request: Request) => {
    if (request.method() !== 'POST' || new URL(request.url()).pathname !== data.path) return;
    state.writes.push(request);
    try {
      const command = request.postDataJSON() as SettleArrangementRequest;
      if (!state.command) state.command = command;
      expect(command).toMatchObject({
        arrangementKey: state.arrangement.key,
        accountingRevision: state.arrangement.accountingRevision,
        paidAmount: '100',
        paidOn: '2027-03-12',
        currencyCode: 'JPY',
        expectedAmount: { numerator: '100', denominator: '1', minorUnit: 0 },
        debtorMemberId: world.splitting.ids.members.get('Amy'),
        creditorMemberId: world.splitting.ids.members.get('Alice'),
      });
      for (const id of [command.id, command.repaymentId])
        expect(id).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
    } catch (error) {
      state.errors.push(error);
    }
  };
  const proof = async (route: Route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      command = state.command;
    const target =
      command &&
      [
        `${data.path}/${command.id}`,
        `/api/trips/${data.tripId}/repayments/${command.repaymentId}`,
        `/api/trips/${data.tripId}/repayments`,
      ].includes(path);
    if (request.method() !== 'GET' || !target) {
      await route.fallback();

      return;
    }
    state.proofReads.push({ request, path, mode: state.proofMode });
    state.pendingProofs++;
    try {
      if (state.proofMode === 'hold') await proofGate;
      if (state.proofMode === 'available') await route.fallback();
      else await route.abort('failed');
    } catch (error) {
      if (!page.isClosed() && !isCancelledRead(request)) state.errors.push(error);
    } finally {
      state.pendingProofs--;
    }
  };
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const proxy: ResponseProxyControl = {
    matches: (request) =>
      request.method === 'POST' &&
      new URL(request.url!, 'http://test.invalid').pathname === data.path,
    async handle(exchange) {
      state.exchanges.push(exchange);
      try {
        expect(exchange.status).toBe(201);
        await expect.poll(() => Boolean(state.command) || state.errors.length > 0).toBe(true);
        expect(state.errors.map(String)).toEqual([]);
        await assertCommitted(
          world,
          state,
          JSON.parse(exchange.body.toString()) as SettlementRecord,
        );

        return 'drop';
      } finally {
        state.finished++;
      }
    },
    failed(error) {
      state.errors.push(error);
    },
  };
  page.on('request', onRequest);
  await page.route('**/api/**', proof);
  controls.add(proxy);
  world.tripManagement.cleanups.add(async () => {
    state.proofMode = 'fail';
    releaseProofs();
    try {
      await expect.poll(() => state.pendingProofs).toBe(0);
    } finally {
      controls.delete(proxy);
      page.off('request', onRequest);
      if (!page.isClosed()) await page.unroute('**/api/**', proof);
    }
    expect(state.errors.map(String)).toEqual([]);
  });
  expect(state.writes.length).toBe(0);
  expect(managementUI(world).writes.length).toBe(0);
  world.set('loading:settlementLoss', state);
}

import { expect, type Page, type Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  fixtureMinorAmount,
  independentSplittingOracle,
} from '../../../../api/tests/support/splitting/expense-fixture.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import { assertSettlementAdjustmentPair } from '../../../../api/tests/support/splitting/settlement-adjustments-result.js';
import {
  settlementFormKey,
  settlementBeforeKey,
  settlementWritesKey,
  type BrowserSettlementDraft,
} from './settlement-form.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import type {
  LostResponseInterceptor,
  StableCommandIds,
  VerificationAvailability,
} from './types.js';

export const lostSettlementTemporaryPhrase = '結清成功回應遺失且原結果暫不可查證';

export const lostSettlementResponseKey = 'splitting:lostSettlementResponse';

export type LostSettlementCommand = BrowserSettlementDraft & { paidAmount: string };

export interface LostSettlementResponseState {
  readonly draft: BrowserSettlementDraft;
  readonly before: BrowserSplittingSnapshot;
  readonly ids: StableCommandIds;
  readonly mutations: RepaymentBrowserWrite[];
  readonly lookups: { id: string; actualStatus: number; browserStatus: number }[];
  readonly mutationFinished: Promise<void>;
  availability: VerificationAvailability;
  failure?: unknown;
  command?: LostSettlementCommand;
  authoritativeAfter?: BrowserSplittingSnapshot;
  savedResponse?: Record<string, unknown>;
  interceptor?: LostResponseInterceptor;
}

export function assertSettlementPayload(
  body: unknown,
  draft: BrowserSettlementDraft,
): asserts body is LostSettlementCommand {
  expect(body).toBeTruthy();
  const command = body as LostSettlementCommand;
  const { paidAmount, ...snapshot } = command;
  expect(
    snapshot,
    'Every original UUID, key, revision and exact fraction must survive transport loss',
  ).toEqual(draft);
  expect(paidAmount).toMatch(/^\d+(?:\.\d+)?$/);
  expect(fixtureMinorAmount(paidAmount, 0)).toBeGreaterThan(0n);
}

/** A dropped response is permitted only after one complete real transaction exists. */
export function assertSavedSettlement(
  before: BrowserSplittingSnapshot,
  after: BrowserSplittingSnapshot,
  command: LostSettlementCommand,
  saved: Record<string, unknown>,
  tripId: string,
): void {
  for (const key of ['members', 'expenses', 'shares'] as const)
    expect(after.sources[key]).toEqual(before.sources[key]);
  const counts = { settlements: 1, repayments: 1, adjustments: 2 } as const;
  for (const key of ['settlements', 'repayments', 'adjustments'] as const) {
    expect(after.sources[key]).toHaveLength(before.sources[key].length + counts[key]);
    for (const old of before.sources[key]) expect(after.sources[key]).toContainEqual(old);
  }
  const events = after.sources.settlements.filter((row) => row.id === command.id);
  const payments = after.sources.repayments.filter((row) => row.id === command.repaymentId);
  const adjustments = after.sources.adjustments.filter((row) => row.settlement_id === command.id);
  expect(events).toHaveLength(1);
  expect(payments).toHaveLength(1);
  expect(adjustments).toHaveLength(2);
  const event = events[0]!,
    payment = payments[0]!;
  expect(event).toMatchObject({
    owner_id: before.sources.trips[0]!.owner_id,
    trip_id: tripId,
    arrangement_key: command.arrangementKey,
    debtor_member_id: command.debtorMemberId,
    creditor_member_id: command.creditorMemberId,
    currency_code: command.currencyCode,
    simplify_debts: before.settlement.simplifyDebts,
  });
  expect(String(event.source_revision)).toBe(command.accountingRevision);
  const obligation = {
    numerator: String(event.obligation_numerator),
    denominator: String(event.obligation_denominator),
    minorUnit: Number(event.obligation_minor_unit),
  };
  expect(independentSplittingOracle.equal(obligation, command.expectedAmount)).toBe(true);
  expect(payment).toMatchObject({
    owner_id: event.owner_id,
    trip_id: tripId,
    payer_member_id: command.debtorMemberId,
    payee_member_id: command.creditorMemberId,
    currency_code: command.currencyCode,
    kind: 'settlement',
    settlement_id: command.id,
  });
  expect(String(payment.amount_minor)).toBe(
    fixtureMinorAmount(command.paidAmount, Number(payment.minor_unit)).toString(),
  );
  const repayment = historicalRepaymentProjection(payment);
  expect(repayment.paidOn).toBe(command.paidOn);
  const od =
    BigInt(command.expectedAmount.denominator) * 10n ** BigInt(command.expectedAmount.minorUnit);
  const pd = 10n ** BigInt(Number(payment.minor_unit));
  const difference = {
    numerator: (
      BigInt(command.expectedAmount.numerator) * pd -
      BigInt(String(payment.amount_minor)) * od
    ).toString(),
    denominator: (od * pd).toString(),
    minorUnit: 0,
  };
  const expected = [
    { memberId: command.debtorMemberId, currencyCode: command.currencyCode, amount: difference },
    {
      memberId: command.creditorMemberId,
      currencyCode: command.currencyCode,
      amount: { ...difference, numerator: (-BigInt(difference.numerator)).toString() },
    },
  ];
  for (const row of adjustments)
    expect(row).toMatchObject({ owner_id: event.owner_id, trip_id: tripId });
  const projected = adjustments.map((row) => ({
    memberId: String(row.member_id),
    currencyCode: String(row.currency_code),
    amount: {
      numerator: String(row.numerator),
      denominator: String(row.denominator),
      minorUnit: Number(row.minor_unit),
    },
  }));
  assertSettlementAdjustmentPair(projected, expected);
  expect(saved).toEqual({
    id: command.id,
    tripId,
    arrangementKey: command.arrangementKey,
    sourceRevision: command.accountingRevision,
    simplifyDebts: before.settlement.simplifyDebts,
    debtorMemberId: command.debtorMemberId,
    creditorMemberId: command.creditorMemberId,
    currencyCode: command.currencyCode,
    obligation,
    repayment,
    adjustments: expect.any(Array),
    createdAt: expect.any(String),
  });
  assertSettlementAdjustmentPair(saved.adjustments as typeof projected, expected);
  expect(Number.isFinite(Date.parse(String(saved.createdAt)))).toBe(true);
  expect(after.repayments.items.find((row) => row.id === command.repaymentId)).toEqual(repayment);
  expect(after.totals).toEqual(before.totals);
  expect(BigInt(after.settlement.accountingRevision)).toBe(BigInt(command.accountingRevision) + 1n);
  expect(after.settlement.simplifyDebts).toBe(before.settlement.simplifyDebts);
  const tripFacts = (snapshot: BrowserSplittingSnapshot) =>
    snapshot.sources.trips.map((row) => {
      const { accounting_revision: revision, updated_at: updated, ...facts } = row;
      expect(String(revision)).toMatch(/^\d+$/);
      void updated;

      return facts;
    });
  expect(tripFacts(after)).toEqual(tripFacts(before));
  expect(after.settlement.arrangements.some((row) => row.key === command.arrangementKey)).toBe(
    false,
  );
}

/** Arrange transport interception only. The following When sends the sole POST. */
export async function arrangeLostSettlementResponse(
  page: Page,
  world: LedgerWorld,
  availability: 'available' | 'temporary-not-found',
): Promise<void> {
  const draft = world.get<BrowserSettlementDraft>(settlementFormKey);
  const before = world.get<BrowserSplittingSnapshot>(settlementBeforeKey);
  expect(world.get<RepaymentBrowserWrite[]>(settlementWritesKey)).toEqual([]);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
  const tripId = splittingTripId(world);
  const collectionPath = `/api/trips/${tripId}/settlements`;
  const detailPath = `${collectionPath}/${draft.id}`;
  let finish!: () => void;
  const mutationFinished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const state: LostSettlementResponseState = {
    draft: structuredClone(draft),
    before,
    ids: { commandId: draft.id, repaymentId: draft.repaymentId, mutationIds: [], lookupIds: [] },
    mutations: [],
    lookups: [],
    availability,
    mutationFinished,
  };
  const handleMutation = async (route: Route): Promise<void> => {
    try {
      const request = route.request();
      const body: unknown = request.postDataJSON();
      state.mutations.push({ method: request.method(), path: collectionPath, body });
      state.ids.mutationIds.push(String((body as Record<string, unknown>).id));
      expect(
        state.mutations,
        'An uncertain settlement must never trigger a second POST',
      ).toHaveLength(1);
      assertSettlementPayload(body, draft);
      state.command = structuredClone(body);
      const response = await route.fetch({ maxRetries: 0, maxRedirects: 0 });
      expect(
        response.status(),
        'Only a genuinely committed settlement response may be dropped',
      ).toBe(201);
      const saved = (await response.json()) as Record<string, unknown>;
      const after = await readBrowserSplittingSnapshot(world);
      assertSavedSettlement(before, after, body, saved, tripId);
      state.savedResponse = saved;
      state.authoritativeAfter = after;
    } catch (error) {
      state.failure = error;
    } finally {
      await route.abort('failed');
      finish();
    }
  };
  const handleVerification = async (route: Route): Promise<void> => {
    try {
      expect(
        state.authoritativeAfter,
        'Verification must follow the real committed transaction',
      ).toBeDefined();
      const actual = await route.fetch({ maxRetries: 0, maxRedirects: 0 });
      expect(
        actual.status(),
        'The saved original settlement UUID must remain at the authority',
      ).toBe(200);
      expect(await actual.json()).toEqual(state.savedResponse);
      const browserStatus = state.availability === 'available' ? 200 : 404;
      state.lookups.push({ id: draft.id, actualStatus: actual.status(), browserStatus });
      state.ids.lookupIds.push(draft.id);
      if (state.availability === 'available') await route.fulfill({ response: actual });
      else
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'NOT_FOUND', message: '找不到此結清紀錄' }),
        });
    } catch (error) {
      state.failure = error;
      await route.abort('failed');
    }
  };
  const handler = async (route: Route): Promise<void> => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (path === collectionPath && request.method() === 'POST') return handleMutation(route);
    if (path === detailPath && request.method() === 'GET' && state.mutations.length > 0)
      return handleVerification(route);
    await route.continue();
  };
  const pattern = `**/api/trips/${tripId}/settlements**`;
  state.interceptor = {
    ids: state.ids,
    handleMutation,
    handleVerification,
    restore: async () => {
      state.availability = 'available';
      await page.unroute(pattern, handler);
      expect(
        state.failure,
        'Transport loss must follow a verified real settlement',
      ).toBeUndefined();
    },
  };
  world.set(lostSettlementResponseKey, state);
  await page.route(pattern, handler);
  expect(state.mutations).toEqual([]);
  expect(state.lookups).toEqual([]);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}

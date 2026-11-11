import { expect, type Page, type Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { fixtureMinorAmount } from '../../../../api/tests/support/splitting/expense-fixture.js';
import {
  repaymentDraftKey,
  repaymentBeforeKey,
  repaymentWritesKey,
  type RepaymentDraft,
  type RepaymentBrowserWrite,
} from './repayment-draft.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import type {
  LostResponseInterceptor,
  StableCommandIds,
  VerificationAvailability,
} from './types.js';

export const lostRepaymentTemporaryPhrase = '獨立還款成功回應遺失且原結果暫不可查證';

export const lostRepaymentResponseKey = 'splitting:lostRepaymentResponse';

export interface LostRepaymentResponseState {
  readonly draft: RepaymentDraft;
  readonly before: BrowserSplittingSnapshot;
  readonly ids: StableCommandIds;
  readonly mutations: RepaymentBrowserWrite[];
  readonly lookups: { id: string; actualStatus: number; browserStatus: number }[];
  readonly mutationFinished: Promise<void>;
  failure?: unknown;
  availability: VerificationAvailability;
  authoritativeAfter?: BrowserSplittingSnapshot;
  savedResponse?: Record<string, unknown>;
  interceptor?: LostResponseInterceptor;
}

export function assertRepaymentPayload(body: unknown, draft: RepaymentDraft): void {
  expect(body, 'The lost-response request must use the original reserved UUID and draft').toEqual(
    draft,
  );
}

/** The first POST must add precisely one independent cash fact, with no settlement event. */
export function assertSavedIndependentRepayment(
  before: BrowserSplittingSnapshot,
  after: BrowserSplittingSnapshot,
  draft: RepaymentDraft,
  saved: Record<string, unknown>,
  tripId: string,
): void {
  expect(saved).toEqual({
    ...draft,
    tripId,
    minorUnit: 0,
    kind: 'independent',
    settlementId: null,
    createdAt: expect.any(String),
  });
  expect(Number.isFinite(Date.parse(String(saved.createdAt)))).toBe(true);
  for (const key of ['members', 'expenses', 'shares', 'settlements', 'adjustments'] as const)
    expect(
      after.sources[key],
      `${key} must not change when saving an independent repayment`,
    ).toEqual(before.sources[key]);
  expect(after.sources.repayments.filter((row) => row.id !== draft.id)).toEqual(
    before.sources.repayments,
  );
  const added = after.sources.repayments.filter((row) => row.id === draft.id);
  expect(added).toHaveLength(1);
  expect(added[0]).toMatchObject({
    id: draft.id,
    owner_id: before.sources.trips[0]!.owner_id,
    trip_id: tripId,
    payer_member_id: draft.payerMemberId,
    payee_member_id: draft.payeeMemberId,
    amount_minor: fixtureMinorAmount(draft.amount, 0).toString(),
    currency_code: draft.currencyCode,
    minor_unit: 0,
    kind: 'independent',
    settlement_id: null,
  });
  expect(after.sources.repayments).toHaveLength(before.sources.repayments.length + 1);
  expect(after.repayments.items.find((row) => row.id === draft.id)).toEqual(saved);
  expect(after.totals).toEqual(before.totals);
  expect(BigInt(after.settlement.accountingRevision)).toBe(
    BigInt(before.settlement.accountingRevision) + 1n,
  );
  expect(after.settlement.simplifyDebts).toBe(before.settlement.simplifyDebts);
  const tripFacts = (snapshot: BrowserSplittingSnapshot) =>
    snapshot.sources.trips.map((row) => {
      const { accounting_revision: revision, updated_at: updated, ...facts } = row;
      expect(String(revision)).toMatch(/^\d+$/);
      void updated;

      return facts;
    });
  expect(tripFacts(after)).toEqual(tripFacts(before));
}

/** Arrange transport only; the following When performs the real save. */
export async function arrangeLostRepaymentResponse(
  page: Page,
  world: LedgerWorld,
  availability: 'available' | 'temporary-not-found',
): Promise<void> {
  const draft = world.get<RepaymentDraft>(repaymentDraftKey);
  const before = world.get<BrowserSplittingSnapshot>(repaymentBeforeKey);
  expect(draft.amount).toBe('400');
  expect(world.get<RepaymentBrowserWrite[]>(repaymentWritesKey)).toEqual([]);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
  const tripId = splittingTripId(world);
  const collectionPath = `/api/trips/${tripId}/repayments`;
  const detailPath = `${collectionPath}/${draft.id}`;
  let finish!: () => void;
  const mutationFinished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const state: LostRepaymentResponseState = {
    draft: structuredClone(draft),
    before,
    ids: { commandId: draft.id, repaymentId: draft.id, mutationIds: [], lookupIds: [] },
    mutations: [],
    lookups: [],
    availability,
    mutationFinished,
  };
  const handleMutation = async (route: Route): Promise<void> => {
    const request = route.request();
    try {
      const body: unknown = request.postDataJSON();
      state.mutations.push({ method: request.method(), path: collectionPath, body });
      state.ids.mutationIds.push(String((body as Record<string, unknown>).id));
      expect(
        state.mutations,
        'An uncertain repayment outcome must never trigger a second POST',
      ).toHaveLength(1);
      assertRepaymentPayload(body, state.draft);
      const response = await route.fetch({ maxRetries: 0, maxRedirects: 0 });
      expect(response.status(), 'Only a real successful POST may have its response dropped').toBe(
        201,
      );
      const saved = (await response.json()) as Record<string, unknown>;
      const after = await readBrowserSplittingSnapshot(world);
      assertSavedIndependentRepayment(before, after, draft, saved, tripId);
      const date = await world.db.query<{ date: string }>(
        'SELECT paid_on::text AS date FROM repayments WHERE id=$1',
        [draft.id],
      );
      expect(date.rows[0]!.date).toBe(draft.paidOn);
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
    expect(
      state.authoritativeAfter,
      'Verification must follow the committed real POST',
    ).toBeDefined();
    const actual = await route.fetch({ maxRetries: 0, maxRedirects: 0 });
    expect(actual.status(), 'Authority must retain the saved original repayment UUID').toBe(200);
    expect(await actual.json()).toEqual(state.savedResponse);
    const browserStatus = state.availability === 'available' ? 200 : 404;
    state.lookups.push({ id: draft.id, actualStatus: actual.status(), browserStatus });
    state.ids.lookupIds.push(draft.id);
    if (state.availability === 'available') await route.fulfill({ response: actual });
    else
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'NOT_FOUND', message: '找不到此還款' }),
      });
  };
  const handler = async (route: Route): Promise<void> => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === collectionPath && request.method() === 'POST') return handleMutation(route);
    if (path === detailPath && request.method() === 'GET' && state.mutations.length > 0)
      return handleVerification(route);
    await route.continue();
  };
  const pattern = `**/api/trips/${tripId}/repayments**`;
  state.interceptor = {
    ids: state.ids,
    handleMutation,
    handleVerification,
    restore: async () => {
      state.availability = 'available';
      await page.unroute(pattern, handler);
      expect(
        state.failure,
        'Dropped-response interception must verify a genuine saved repayment',
      ).toBeUndefined();
    },
  };
  world.set(lostRepaymentResponseKey, state);
  await page.route(pattern, handler);
  expect(state.mutations).toEqual([]);
  expect(state.lookups).toEqual([]);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}

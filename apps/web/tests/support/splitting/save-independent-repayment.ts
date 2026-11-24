import { expect, type Page, type Request, type Response } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  repaymentDraftKey,
  repaymentBeforeKey,
  repaymentWritesKey,
  type RepaymentDraft,
  type RepaymentBrowserWrite,
} from './repayment-draft.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  assertRepaymentPayload,
  assertSavedIndependentRepayment,
  lostRepaymentResponseKey,
  type LostRepaymentResponseState,
} from './lost-repayment-response.js';

export const saveIndependentRepaymentPhrase = 'owner 保存獨立還款';

export const independentRepaymentSaveKey = 'splitting:independentRepaymentSave';

export type RepaymentSaveOutcome =
  'saved' | 'warning' | 'rejected' | 'local-validation' | 'recovered' | 'unconfirmed';

export interface IndependentRepaymentSave {
  outcome: RepaymentSaveOutcome;
  draft: RepaymentDraft;
  payload: unknown;
  status: number | null;
  response: unknown;
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
}

/** Only definite client errors prove no cash fact was saved; a 5xx may follow commit. */
export function repaymentSubmissionOutcome(status: number): RepaymentSaveOutcome {
  if (status === 201) return 'saved';
  if (status === 409) return 'warning';
  if (status >= 400 && status < 500) return 'rejected';

  return 'unconfirmed';
}

/** Observe one click, including client validation and dropped-response recovery. No retry Act. */
export async function observeIndependentRepaymentSave(page: Page, tripId: string) {
  const path = `/api/trips/${tripId}/repayments`;
  const requests: Request[] = [];
  const responses: Response[] = [];
  const matches = (request: Request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === path;
  const onRequest = (request: Request) => {
    if (matches(request)) requests.push(request);
  };
  const onResponse = (response: Response) => {
    if (matches(response.request())) responses.push(response);
  };
  page.on('request', onRequest);
  page.on('response', onResponse);
  let outcome: RepaymentSaveOutcome | null = null;
  try {
    await page.getByRole('button', { name: '儲存還款', exact: true }).click();
    await expect
      .poll(
        async () => {
          expect(
            requests.length,
            'One repayment save must never automatically POST again',
          ).toBeLessThanOrEqual(1);
          if (responses.length) outcome = repaymentSubmissionOutcome(responses[0]!.status());
          else if (
            await page
              .getByText(/尚無法確認|尚未確認|結果待確認|結果未明|無法確認.*(?:保存|儲存)/)
              .first()
              .isVisible()
          )
            outcome = 'unconfirmed';
          else if (
            requests.length === 1 &&
            (await page
              .getByText(/還款已儲存|已儲存還款|還款已保存|還款成功|儲存成功|保存成功/)
              .first()
              .isVisible())
          )
            outcome = 'recovered';
          else if (
            requests.length === 0 &&
            ((await page
              .locator('[aria-invalid="true"], input:invalid, select:invalid')
              .first()
              .isVisible()) ||
              (await page
                .locator('[role="alert"], .error')
                .filter({ hasText: /(?:付款人|收款人|正數|金額)/ })
                .first()
                .isVisible()))
          )
            outcome = 'local-validation';

          return outcome !== null;
        },
        {
          message:
            'One save must reach a 201/409, visible validation, recovery, or unknown outcome',
        },
      )
      .toBe(true);

    return { outcome: outcome!, request: requests[0] ?? null, response: responses[0] ?? null };
  } finally {
    page.off('request', onRequest);
    page.off('response', onResponse);
  }
}

export async function saveIndependentRepayment(page: Page, world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const draft = structuredClone(world.get<RepaymentDraft>(repaymentDraftKey));
  const before = world.get<BrowserSplittingSnapshot>(repaymentBeforeKey);
  expect(
    await readBrowserSplittingSnapshot(world),
    'The original repayment draft is still unsaved',
  ).toEqual(before);
  expect(world.get<RepaymentBrowserWrite[]>(repaymentWritesKey)).toEqual([]);
  const observed = await observeIndependentRepaymentSave(page, tripId);
  const payload: unknown = observed.request?.postDataJSON() ?? null;
  if (observed.request) assertRepaymentPayload(payload, draft);
  else expect(observed.outcome).toBe('local-validation');
  let response: unknown = null;
  if (observed.response) {
    const text = await observed.response.text();
    try {
      response = JSON.parse(text);
    } catch {
      response = text;
    }
  }
  const lost = world.state.get(lostRepaymentResponseKey) as LostRepaymentResponseState | undefined;
  if (lost) {
    await expect
      .poll(() => lost.authoritativeAfter !== undefined || lost.failure !== undefined, {
        message: 'Dropped response must follow a verified real committed repayment',
      })
      .toBe(true);
    expect(lost.failure).toBeUndefined();
    expect(lost.mutations).toHaveLength(1);
  }
  const after = await readBrowserSplittingSnapshot(world);
  if (observed.outcome === 'saved')
    assertSavedIndependentRepayment(
      before,
      after,
      draft,
      response as Record<string, unknown>,
      tripId,
    );
  else if (observed.outcome === 'recovered') {
    expect(
      lost,
      'Recovered success requires the original UUID lookup, never a second POST',
    ).toBeDefined();
    expect(
      lost!.lookups.some((lookup) => lookup.id === draft.id && lookup.browserStatus === 200),
    ).toBe(true);
    assertSavedIndependentRepayment(before, after, draft, lost!.savedResponse!, tripId);
  } else if (observed.outcome !== 'unconfirmed') expect(after).toEqual(before);
  expect(world.get<RepaymentBrowserWrite[]>(repaymentWritesKey)).toEqual(
    observed.request
      ? [{ method: 'POST', path: `/api/trips/${tripId}/repayments`, body: draft }]
      : [],
  );
  world.set(independentRepaymentSaveKey, {
    outcome: observed.outcome,
    draft,
    payload,
    status: observed.response?.status() ?? null,
    response,
    before,
    after,
  } satisfies IndependentRepaymentSave);
}

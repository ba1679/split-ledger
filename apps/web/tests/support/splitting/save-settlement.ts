import { expect, type Page, type Request, type Response } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  SettlementPaymentForm,
  settlementFormKey,
  settlementWritesKey,
  type BrowserSettlementDraft,
} from './settlement-form.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  assertSavedSettlement,
  lostSettlementResponseKey,
  type LostSettlementCommand,
  type LostSettlementResponseState,
} from './lost-settlement-response.js';

export const saveSettlementPhrase = 'owner 輸入實付 JPY {word} 並結清';

export const settlementSaveKey = 'splitting:browserSettlementSave';

export type SettlementSaveOutcome =
  'saved' | 'rejected' | 'local-validation' | 'recovered' | 'unconfirmed';

export interface BrowserSettlementSave {
  outcome: SettlementSaveOutcome;
  command: LostSettlementCommand;
  payload: unknown;
  status: number | null;
  response: unknown;
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
}

/** A server failure can occur after commit; only 4xx proves a rejected command. */
export function settlementSubmissionOutcome(status: number): SettlementSaveOutcome {
  if (status === 201) return 'saved';
  if (status >= 400 && status < 500) return 'rejected';

  return 'unconfirmed';
}

export function assertOriginalSettlementCommand(
  payload: unknown,
  draft: BrowserSettlementDraft,
  amount: string,
): void {
  expect(amount, 'JPY DSL amounts are integer major units, including invalid zero').toMatch(
    /^\d+$/,
  );
  expect(payload, 'Submit the original two UUIDs and full exact arrangement snapshot').toEqual({
    ...draft,
    paidAmount: amount,
  });
}

/** Click exactly once; read-only reconciliation belongs to the application. */
export async function observeSettlementSave(page: Page, tripId: string, commandId: string) {
  const path = `/api/trips/${tripId}/settlements`;
  const requests: Request[] = [];
  const responses: Response[] = [];
  const lookups: Response[] = [];
  const matches = (request: Request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === path;
  const onRequest = (request: Request) => {
    if (matches(request)) requests.push(request);
  };
  const onResponse = (response: Response) => {
    if (matches(response.request())) responses.push(response);
    if (
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `${path}/${commandId}`
    )
      lookups.push(response);
  };
  page.on('request', onRequest);
  page.on('response', onResponse);
  let outcome: SettlementSaveOutcome | null = null;
  try {
    await page.getByRole('button', { name: '結清這筆安排', exact: true }).click();
    await expect
      .poll(
        async () => {
          expect(
            requests.length,
            'A settlement click must never automatically POST again',
          ).toBeLessThanOrEqual(1);
          if (responses.length) outcome = settlementSubmissionOutcome(responses[0]!.status());
          else if (
            await page
              .getByText(/尚無法確認|尚未確認|結果未明/)
              .first()
              .isVisible()
          )
            outcome = 'unconfirmed';
          else if (
            requests.length === 1 &&
            lookups.some((lookup) => lookup.status() === 200) &&
            (await page
              .getByText(/結清成功|已結清|結清已儲存|結清已保存/)
              .first()
              .isVisible())
          )
            outcome = 'recovered';
          else if (
            requests.length === 0 &&
            ((await page.locator('[aria-invalid="true"], input:invalid').first().isVisible()) ||
              (await page
                .locator('[role="alert"], .error')
                .filter({ hasText: /正數|實付金額/ })
                .first()
                .isVisible()))
          )
            outcome = 'local-validation';

          return outcome !== null;
        },
        {
          message:
            'The single settlement attempt must reach success, rejection, validation, recovery or uncertainty',
        },
      )
      .toBe(true);

    return { outcome: outcome!, request: requests[0] ?? null, response: responses[0] ?? null };
  } finally {
    page.off('request', onRequest);
    page.off('response', onResponse);
  }
}

export async function saveBrowserSettlement(
  page: Page,
  world: LedgerWorld,
  amount: string,
): Promise<void> {
  expect(amount).toMatch(/^\d+$/);
  const tripId = splittingTripId(world);
  const draft = structuredClone(world.get<BrowserSettlementDraft>(settlementFormKey));
  // A second device may already have changed the source. Keep the old command,
  // but compare a rejection against the actual current authority, not its old revision.
  const before = await readBrowserSplittingSnapshot(world);
  expect(world.get<RepaymentBrowserWrite[]>(settlementWritesKey)).toEqual([]);
  const form = new SettlementPaymentForm(page);
  await form.paidAmount.fill(amount);
  await expect(form.paidAmount).toHaveValue(amount);
  const observed = await observeSettlementSave(page, tripId, draft.id);
  const command: LostSettlementCommand = { ...draft, paidAmount: amount };
  const payload: unknown = observed.request?.postDataJSON() ?? null;
  if (observed.request) assertOriginalSettlementCommand(payload, draft, amount);
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
  const lost = world.state.get(lostSettlementResponseKey) as
    LostSettlementResponseState | undefined;
  if (lost) {
    await expect
      .poll(() => lost.authoritativeAfter !== undefined || lost.failure !== undefined, {
        message: 'The lost response must follow one verified real committed settlement',
      })
      .toBe(true);
    expect(lost.failure).toBeUndefined();
    expect(lost.mutations).toHaveLength(1);
  }
  const after = await readBrowserSplittingSnapshot(world);
  if (observed.outcome === 'saved')
    assertSavedSettlement(before, after, command, response as Record<string, unknown>, tripId);
  else if (observed.outcome === 'recovered') {
    expect(lost, 'Recovered success requires an original UUID lookup').toBeDefined();
    expect(
      lost!.lookups.some((lookup) => lookup.id === draft.id && lookup.browserStatus === 200),
    ).toBe(true);
    assertSavedSettlement(before, after, command, lost!.savedResponse!, tripId);
  } else if (observed.outcome !== 'unconfirmed') expect(after).toEqual(before);
  expect(world.get<RepaymentBrowserWrite[]>(settlementWritesKey)).toEqual(
    observed.request
      ? [{ method: 'POST', path: `/api/trips/${tripId}/settlements`, body: command }]
      : [],
  );
  world.set(settlementSaveKey, {
    outcome: observed.outcome,
    command,
    payload,
    status: observed.response?.status() ?? null,
    response,
    before,
    after,
  } satisfies BrowserSettlementSave);
}

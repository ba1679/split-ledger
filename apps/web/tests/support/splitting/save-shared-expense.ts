import { expect, type Page, type Request, type Response } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import {
  sharedExpenseBeforeKey,
  sharedExpenseDraftKey,
  sharedExpensePostsKey,
  type SharedExpenseDraft,
} from './expense-draft.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const saveSharedExpensePhrase = 'owner 保存共同支出';

export const sharedExpenseSaveKey = 'splitting:expenseSave';

/** A server error can occur after commit; only 4xx proves a rejected creation. */
export function expenseSubmissionOutcome(status: number): 'saved' | 'rejected' | 'unconfirmed' {
  if (status >= 200 && status < 300) return 'saved';
  if (status >= 400 && status < 500) return 'rejected';

  return 'unconfirmed';
}

export interface SharedExpenseSave {
  outcome: 'local-validation' | 'saved' | 'rejected' | 'unconfirmed';
  /** The ID actually allocated by the product, never an ID invented by this When. */
  expenseId: string | null;
  payload: Record<string, unknown> | null;
  status: number | null;
  response: unknown;
  draft: SharedExpenseDraft;
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
}

interface ObservedExpenseSubmission {
  request: Request | null;
  response: Response | null;
  outcome: SharedExpenseSave['outcome'];
}

/** Click exactly once; local validation does not require a network response to finish. */
export async function observeSingleExpenseSubmission(
  page: Page,
  tripId: string,
): Promise<ObservedExpenseSubmission> {
  const path = `/api/trips/${tripId}/expenses`;
  const requests: Request[] = [];
  const responses: Response[] = [];
  const isCreate = (request: Request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === path;
  const onRequest = (request: Request) => {
    if (isCreate(request)) requests.push(request);
  };
  const onResponse = (response: Response) => {
    if (isCreate(response.request())) responses.push(response);
  };
  page.on('request', onRequest);
  page.on('response', onResponse);
  let outcome: SharedExpenseSave['outcome'] | null = null;
  try {
    await page.getByRole('button', { name: '儲存支出', exact: true }).click();
    await expect
      .poll(
        async () => {
          expect(
            requests.length,
            'A single save must never send a second creation',
          ).toBeLessThanOrEqual(1);
          if (responses.length) {
            outcome = expenseSubmissionOutcome(responses[0]!.status());
          } else if (
            await page
              .getByText(/尚無法確認|尚未確認|結果未明|無法確認.*保存/)
              .first()
              .isVisible()
          ) {
            outcome = 'unconfirmed';
          } else if (
            requests.length === 0 &&
            ((await page.locator('[aria-invalid="true"]').first().isVisible()) ||
              (await page
                .locator('[role="alert"], .error')
                .filter({ hasText: /(?:請|至少).*選.*(?:付款人|分攤|一人)/ })
                .first()
                .isVisible()))
          ) {
            outcome = 'local-validation';
          }

          return outcome !== null;
        },
        {
          message:
            'One save must reach a response, visible field validation, or an explicit unknown outcome',
        },
      )
      .toBe(true);

    return { request: requests[0] ?? null, response: responses[0] ?? null, outcome: outcome! };
  } finally {
    page.off('request', onRequest);
    page.off('response', onResponse);
  }
}

export async function saveSharedExpense(page: Page, world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const draft = structuredClone(world.get<SharedExpenseDraft>(sharedExpenseDraftKey));
  const before = world.get<BrowserSplittingSnapshot>(sharedExpenseBeforeKey);
  expect(await snapshotSplittingSources(world), 'Draft must still be unsaved before Act').toEqual(
    before.sources,
  );
  expect(world.get<unknown[]>(sharedExpensePostsKey)).toEqual([]);
  const observed = await observeSingleExpenseSubmission(page, tripId);
  const payload = observed.request?.postDataJSON() as Record<string, unknown> | undefined;
  const expenseId = payload ? String(payload.id) : null;
  if (payload) {
    expect(expenseId, 'Product must reserve a UUID before creating an expense').toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    const { shareMemberIds, ...fields } = draft;
    expect(payload).toMatchObject({ ...fields });
    expect(Array.isArray(payload.shareMemberIds)).toBe(true);
    expect([...(payload.shareMemberIds as string[])].sort()).toEqual([...shareMemberIds].sort());
    expect(Object.keys(payload).sort()).toEqual([...Object.keys(draft), 'id'].sort());
    expect(world.get<unknown[]>(sharedExpensePostsKey)).toEqual([payload]);
    world.splitting.ids.expenses.set(draft.item, expenseId!);
    world.set('splitting:expenseId', expenseId);
  } else {
    expect(observed.outcome).toBe('local-validation');
    expect(world.get<unknown[]>(sharedExpensePostsKey)).toEqual([]);
  }
  const response: unknown = observed.response ? await observed.response.json() : null;
  if (observed.outcome === 'saved') {
    expect(observed.response!.status()).toBe(201);
    expect(response).toMatchObject({ id: expenseId, tripId, item: draft.item });
    await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/?$`));
    await expect(page.getByText(draft.item, { exact: true })).toBeVisible();
  }
  const after = await readBrowserSplittingSnapshot(world);
  if (observed.outcome === 'saved') {
    expect(after.expenses.items.some((row) => row.id === expenseId)).toBe(true);
    expect(BigInt(after.settlement.accountingRevision)).toBe(
      BigInt(before.settlement.accountingRevision) + 1n,
    );
  } else if (observed.outcome !== 'unconfirmed') {
    expect(after).toEqual(before);
  }
  expect(
    world.get<unknown[]>(sharedExpensePostsKey),
    'Authority refresh must not trigger a duplicate expense creation',
  ).toEqual(payload ? [payload] : []);
  world.set(sharedExpenseSaveKey, {
    outcome: observed.outcome,
    expenseId,
    payload: payload ?? null,
    status: observed.response?.status() ?? null,
    response,
    draft,
    before,
    after,
  } satisfies SharedExpenseSave);
}

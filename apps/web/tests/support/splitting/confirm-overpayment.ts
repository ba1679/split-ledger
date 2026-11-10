import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  browserOverpaymentWarningKey,
  type BrowserOverpaymentWarning,
} from './overpayment-warning.js';
import { repaymentWritesKey, type RepaymentBrowserWrite } from './repayment-draft.js';

export const confirmOverpaymentPhrase = 'owner 明確確認超額還款';

export const confirmedOverpaymentKey = 'splitting:confirmedOverpayment';

export interface ConfirmedOverpayment {
  original: BrowserOverpaymentWarning;
  before: BrowserSplittingSnapshot;
  payload: unknown;
  status: number;
  response: unknown;
  writes: RepaymentBrowserWrite[];
}

/** The confirmation carries the complete server-issued snapshot and the original command. */
export function assertOriginalOverpaymentConfirmation(
  payload: unknown,
  original: BrowserOverpaymentWarning,
): void {
  expect(
    payload,
    'Confirmation must retain the original UUID, payment, token and snapshot',
  ).toEqual({
    ...original.request,
    overpaymentConfirmation: original.confirmation,
  });
}

/** One explicit confirmation click. Automatic conflict recovery may only request a new warning. */
export async function confirmBrowserOverpayment(page: Page, world: LedgerWorld): Promise<void> {
  const original = structuredClone(
    world.get<BrowserOverpaymentWarning>(browserOverpaymentWarningKey),
  );
  const before = await readBrowserSplittingSnapshot(world);
  const writes = world.get<RepaymentBrowserWrite[]>(repaymentWritesKey);
  expect(writes, 'Only the original unconfirmed warning submission precedes the Act').toEqual([
    original.warningPost,
  ]);
  const path = `/api/trips/${splittingTripId(world)}/repayments`;
  const confirm = page.getByRole('button', { name: /確認.*(?:還款|保存|儲存)/ });
  await expect(
    confirm,
    'The genuine pending warning must expose explicit confirmation',
  ).toBeVisible();
  const pending = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === path,
  );
  await confirm.click();
  const response = await pending;
  const payload: unknown = response.request().postDataJSON();
  assertOriginalOverpaymentConfirmation(payload, original);
  expect([201, 409], 'Confirmation must save or reject the stale accounting revision').toContain(
    response.status(),
  );
  const body: unknown = await response.json();
  if (response.status() === 201) {
    await expect(
      page.getByText(/還款已儲存|已儲存還款|還款已保存|還款成功|儲存成功|保存成功/).first(),
    ).toBeVisible();
    expect(writes, 'A successful confirmation sends exactly one additional POST').toEqual([
      original.warningPost,
      { method: 'POST', path, body: payload },
    ]);
  } else {
    expect(body, 'Old confirmation must fail with a revision conflict').toMatchObject({
      code: 'ACCOUNTING_REVISION_CONFLICT',
    });
    await expect(page.getByText(/超額.*JPY\s*200/)).toBeVisible();
    await expect(confirm, 'A new warning must require another explicit confirmation').toBeVisible();
    expect(
      writes.length,
      'Conflict recovery cannot repeatedly resubmit the old confirmation',
    ).toBeLessThanOrEqual(3);
    expect(writes[1]).toEqual({ method: 'POST', path, body: payload });
    if (writes[2])
      expect(
        writes[2],
        'Optional warning refresh retains the command and omits old confirmation',
      ).toEqual({
        method: 'POST',
        path,
        body: original.request,
      });
  }
  world.set(confirmedOverpaymentKey, {
    original,
    before,
    payload,
    status: response.status(),
    response: body,
    writes: structuredClone(writes),
  } satisfies ConfirmedOverpayment);
}

import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  browserOverpaymentWarningKey,
  type BrowserOverpaymentWarning,
} from './overpayment-warning.js';
import { repaymentWritesKey, type RepaymentBrowserWrite } from './repayment-draft.js';

export const cancelOverpaymentPhrase = 'owner 取消超額還款';

export const cancelledOverpaymentKey = 'splitting:cancelledOverpayment';

export interface CancelledOverpayment {
  warning: BrowserOverpaymentWarning;
  writesBefore: RepaymentBrowserWrite[];
  writesAfter: RepaymentBrowserWrite[];
}

/** Cancel the existing server warning once; no submission or retry is part of this Act. */
export async function cancelBrowserOverpayment(page: Page, world: LedgerWorld): Promise<void> {
  const warning = world.get<BrowserOverpaymentWarning>(browserOverpaymentWarningKey);
  const writes = world.get<RepaymentBrowserWrite[]>(repaymentWritesKey);
  const writesBefore = structuredClone(writes);
  expect(writesBefore, 'Arrange must have submitted only the original warning request').toEqual([
    warning.warningPost,
  ]);
  const confirmation = page.getByRole('button', { name: /確認.*(?:還款|保存|儲存)/ });
  const cancel = page.getByRole('button', { name: '取消', exact: true });
  await expect(confirmation, 'A real pending overpayment warning must be open').toBeVisible();
  await expect(cancel).toBeVisible();
  await cancel.click();
  await expect(confirmation, 'Cancel must dismiss the pending confirmation').toBeHidden();
  await expect(page.getByText(/超額.*JPY\s*100/)).toBeHidden();
  expect(writes, 'Cancellation must not confirm, retry, or send a new UUID').toEqual(writesBefore);
  world.set(cancelledOverpaymentKey, {
    warning: structuredClone(warning),
    writesBefore,
    writesAfter: structuredClone(writes),
  } satisfies CancelledOverpayment);
}

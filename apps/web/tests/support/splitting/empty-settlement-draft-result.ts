import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingMemberId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { openedAmySettlementKey } from './open-amy-settlement.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';
import {
  SettlementPaymentForm,
  settlementArrangement,
  settlementWritesKey,
} from './settlement-form.js';

export const emptySettlementDraftPhrase = '應付顯示 JPY 33.33 而實付留空且沒有取整方式選擇';

/** Read only: no filling, submission, navigation, or replacement arrangement. */
export async function assertEmptySettlementDraftUi(page: Page): Promise<void> {
  const main = page.locator('main');
  // The amount may share a text node with its label or have an accessible name.
  // Inspect the accessible tree without imposing a particular DOM element layout.
  await expect.poll(() => main.ariaSnapshot()).toMatch(/應付(?:金額)?/);
  await expect.poll(() => main.ariaSnapshot()).toMatch(/JPY\s+33\.33(?!\d)/);
  expect(await main.ariaSnapshot()).not.toMatch(
    /33\.\d{3}|100\s*[/÷]\s*3|33\.33\s*[（(]|33\.33\s*(?:…|\.\.\.)/,
  );
  await expect(main).not.toContainText(
    /33\.\d{3}|100\s*[/÷]\s*3|33\.33\s*[（(]|33\.33\s*(?:…|\.\.\.)/,
  );
  await expect(new SettlementPaymentForm(page).paidAmount).toHaveValue('');
  const policy = /取整|四捨五入|向上|向下|round(?:ing)?|ceil|floor/i;
  for (const role of ['combobox', 'radio', 'checkbox', 'button', 'textbox', 'spinbutton'] as const)
    await expect(main.getByRole(role, { name: policy })).toHaveCount(0);
  // Also cover a select whose generic label hides policy names inside its options.
  await expect(
    main.locator('select').filter({ has: page.locator('option').filter({ hasText: policy }) }),
  ).toHaveCount(0);
}

export async function assertEmptySettlementDraft(page: Page, world: LedgerWorld): Promise<void> {
  const opened = world.get<{
    before: BrowserSplittingSnapshot;
    arrangement: BrowserSplittingSnapshot['settlement']['arrangements'][number];
    accountingRevision: string;
  }>(openedAmySettlementKey);
  expect(opened, 'The completed opening When must supply the original arrangement').toBeDefined();
  await assertEmptySettlementDraftUi(page);
  const latest = await readBrowserSplittingSnapshot(world);
  const arrangement = settlementArrangement(
    latest.settlement,
    'Amy',
    splittingMemberId(world, 'Amy'),
    splittingMemberId(world, 'Alice'),
  );
  expect(arrangement.amount, 'Displayed decimals must not replace the full obligation').toEqual({
    numerator: '100',
    denominator: '3',
    minorUnit: 0,
  });
  expect(arrangement).toEqual(opened.arrangement);
  expect(latest.settlement.accountingRevision).toBe(opened.accountingRevision);
  expect(latest, 'Opening and inspecting a blank payment must preserve all facts').toEqual(
    opened.before,
  );
  expect(world.get<RepaymentBrowserWrite[]>(settlementWritesKey)).toEqual([]);
}

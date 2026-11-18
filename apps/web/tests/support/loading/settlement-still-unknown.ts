import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { SettlementLoss } from './settlement-loss.js';
import { settlementRecheckName } from './end-settlement-verification.js';
import { assertSettlementDraft, assertSettlementFactsStable } from './settlement-unknown.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function assertSettlementStillUnknown(world: LedgerWorld): Promise<void> {
  const state = world.get<SettlementLoss>('loading:settlementLoss'),
    ui = managementUI(world),
    page = ui.page;
  expect(state.proofMode).toBe('fail');
  expect(state.pendingProofs).toBe(0);
  expect(world.get('loading:paymentRoundEnded')).toEqual({
    commandId: state.command!.id,
    repaymentId: state.command!.repaymentId,
  });
  await expect(page.getByText(/結果(?:尚未確認|無法確認|仍未確認)/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: settlementRecheckName })).toBeEnabled();
  await waitForManagementReads(ui);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  const continuous = await page.locator('form').evaluate(
    (element) =>
      [element, ...element.querySelectorAll('*')].filter((node) => {
        const style = getComputedStyle(node),
          box = node.getBoundingClientRect();

        return (
          box.width > 0 &&
          box.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.animationName !== 'none' &&
          style.animationIterationCount.split(',').some((value) => value.trim() === 'infinite') &&
          style.animationPlayState.split(',').some((value) => value.trim() === 'running')
        );
      }).length,
  );
  expect(continuous, 'An unknown result must stop persistent busy animations').toBe(0);
  await expect(
    page.locator(
      'form animate[repeatCount="indefinite"],form animateTransform[repeatCount="indefinite"]',
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({
      hasText:
        /^\s*(?:結清成功|已結清|(?:實付|付款)已(?:確認|保存|儲存)|保存失敗|儲存失敗|結清失敗)/,
    }),
  ).toHaveCount(0);
  await assertSettlementDraft(world);
  await assertSettlementFactsStable(world);
}

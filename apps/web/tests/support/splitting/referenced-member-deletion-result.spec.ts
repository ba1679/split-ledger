import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserStaleMemberDeletion } from './stale-member-deletion-fixture.js';
import { confirmStaleMemberDeletion } from './confirm-stale-member-deletion.js';
import {
  assertMemberInUseGuidance,
  assertReferencedMemberDeletionRejected,
  referencedMemberDeletionPhrase,
} from './referenced-member-deletion-result.js';

test('T193: rejected stale deletion retains Amy and every newly referenced financial fact', async ({
  page,
  world,
}) => {
  await seedBrowserStaleMemberDeletion(page, world);
  await confirmStaleMemberDeletion(page, world, 'Amy');
  await runIsolatedStep(
    {
      phrase: referencedMemberDeletionPhrase,
      input: undefined,
      execute: (context) => assertReferencedMemberDeletionRejected(page, context),
    },
    world,
  );
});

test('T193: understandable rejection offers enabled keyboard deactivation without clicking', async ({
  page,
}) => {
  await page.setContent(
    '<p role="alert">Amy 已被使用，無法刪除，可改為停用。</p><button onclick="this.dataset.clicked=\'true\'">停用 Amy</button>',
  );
  await assertMemberInUseGuidance(page);
  await expect(page.getByRole('button')).not.toHaveAttribute('data-clicked');
  await page.getByRole('button').evaluate((button) => button.setAttribute('disabled', ''));
  await expect(assertMemberInUseGuidance(page)).rejects.toThrow();
  await page.getByRole('button').evaluate((button) => button.removeAttribute('disabled'));
  await page.getByRole('alert').evaluate((alert) => (alert.textContent = 'MEMBER_IN_USE'));
  await expect(assertMemberInUseGuidance(page)).rejects.toThrow();
});

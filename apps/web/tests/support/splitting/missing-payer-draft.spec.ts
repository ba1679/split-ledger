import { test } from '../fixtures.js';
import {
  seedSplittingMembers,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { expenseDraftMemberNames } from './expense-draft.js';
import {
  fillMissingPayerDraft,
  missingPayerDraftPhrase,
  mountMissingPayerDraft,
} from './missing-payer-draft.js';

test('T115: isolated Given keeps a null payer, valid shares and an unsaved authoritative snapshot', async ({
  page,
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: missingPayerDraftPhrase,
      input: undefined,
      execute: async (context) => fillMissingPayerDraft(page, context),
    },
    world,
  );
});

test('T115: actual component must honor the public initialDraft null payer contract', async ({
  page,
  world,
}) => {
  await seedSplittingMembers(world);
  const tripId = splittingTripId(world);
  await world.db.query('DELETE FROM trip_members WHERE id=$1 AND trip_id=$2', [
    world.splitting.ids.members.get('Carol')!,
    tripId,
  ]);
  world.splitting.ids.members.delete('Carol');
  await world.db.query('UPDATE trips SET start_date=$2,end_date=$2 WHERE id=$1', [
    tripId,
    '2027-03-11',
  ]);
  await login(page, world);
  await mountMissingPayerDraft(page, tripId, {
    item: '點心',
    amount: '100',
    currencyCode: 'JPY',
    spentOn: '2027-03-11',
    categoryId: null,
    payerMemberId: null,
    shareMemberIds: expenseDraftMemberNames.map((name) => world.splitting.ids.members.get(name)!),
  });
});

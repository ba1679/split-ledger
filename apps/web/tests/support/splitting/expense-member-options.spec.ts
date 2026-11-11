import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedInactiveReferencedMember } from './inactive-referenced-member-fixture.js';
import {
  openExpenseMemberOptions,
  expenseMemberOptionsPhrase,
  expenseMemberOptionsKey,
  type ExpenseMemberOptions,
} from './expense-member-options.js';

test('T161: opening expense member options queries the directory without changing the ledger', async ({
  page,
  world,
}) => {
  await seedInactiveReferencedMember(page, world, '小美');
  await runIsolatedStep(
    {
      phrase: expenseMemberOptionsPhrase,
      input: undefined,
      execute: (context) => openExpenseMemberOptions(page, context),
    },
    world,
  );
  const result = world.get<ExpenseMemberOptions>(expenseMemberOptionsKey);
  expect(result.status).toBe(200);
  expect(result.members.find((member) => member.name === '小美')).toMatchObject({
    isActive: false,
  });
  expect(new URL(page.url()).pathname).toBe(`/trips/${result.tripId}/expenses/new`);
  expect(result.writes).toEqual([]);
  expect(result.after).toEqual(result.before);
});

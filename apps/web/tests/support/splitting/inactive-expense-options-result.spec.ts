import { test, expect } from '../fixtures.js';
import { seedInactiveReferencedMember } from './inactive-referenced-member-fixture.js';
import { openExpenseMemberOptions } from './expense-member-options.js';
import {
  assertInactiveMemberChoices,
  assertInactiveExpenseOptions,
} from './inactive-expense-options-result.js';

test('T190: inactive member exclusion rejects keyboard-selectable or preselected IDs and missing active choices', () => {
  const active = { id: 'alice', disabled: false, selected: true };
  assertInactiveMemberChoices([active], 'amy', ['alice']);
  assertInactiveMemberChoices([active, { id: 'amy', disabled: true, selected: false }], 'amy', [
    'alice',
  ]);
  expect(() =>
    assertInactiveMemberChoices([active, { id: 'amy', disabled: false, selected: false }], 'amy', [
      'alice',
    ]),
  ).toThrow();
  expect(() =>
    assertInactiveMemberChoices([active, { id: 'amy', disabled: true, selected: true }], 'amy', [
      'alice',
    ]),
  ).toThrow();
  expect(() => assertInactiveMemberChoices([], 'amy', ['alice'])).toThrow();
  expect(() => assertInactiveMemberChoices([active, active], 'amy', ['alice'])).toThrow();
});

test('T190: new expenses cannot select an inactive historical companion while all history remains intact', async ({
  page,
  world,
}) => {
  await seedInactiveReferencedMember(page, world, '小美');
  await openExpenseMemberOptions(page, world);
  await assertInactiveExpenseOptions(page, world, '小美');
});

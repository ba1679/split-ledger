import { test, expect } from '../fixtures.js';
import {
  assertActiveMemberIdentity,
  assertActiveMemberOptions,
} from './active-member-options-result.js';
import { seedBrowserMemberDirectory } from './member-directory-fixture.js';
import { createBrowserMember } from './create-member.js';
import { seedInactiveReferencedMember } from './inactive-referenced-member-fixture.js';
import { reactivateBrowserMember } from './reactivate-member.js';

test('T187: lifecycle identity rejects replacement, duplication, untrimmed and inactive members', () => {
  const alice = { id: 'alice', name: 'Alice', role: 'owner', is_active: true };
  const carol = { id: 'carol', name: 'Carol', role: 'companion', is_active: true };
  assertActiveMemberIdentity([alice], [alice, carol], 'carol', 'Carol', 'create');
  expect(() =>
    assertActiveMemberIdentity(
      [alice],
      [alice, { ...carol, name: ' Carol ' }],
      'carol',
      'Carol',
      'create',
    ),
  ).toThrow();
  expect(() =>
    assertActiveMemberIdentity(
      [alice],
      [alice, { ...carol, is_active: false }],
      'carol',
      'Carol',
      'create',
    ),
  ).toThrow();
  expect(() =>
    assertActiveMemberIdentity([alice], [alice, carol, carol], 'carol', 'Carol', 'create'),
  ).toThrow();
  const inactive = { ...carol, is_active: false };
  assertActiveMemberIdentity([alice, inactive], [alice, carol], 'carol', 'Carol', 'reactivate');
  expect(() =>
    assertActiveMemberIdentity(
      [alice, inactive],
      [alice, { ...carol, id: 'new-carol' }],
      'carol',
      'Carol',
      'reactivate',
    ),
  ).toThrow();
  expect(() =>
    assertActiveMemberIdentity([alice, inactive], [alice, carol], 'carol', 'Carol', 'create'),
  ).toThrow();
});

test('T187: new trimmed Carol appears as the submitted stable UUID in both expense pickers', async ({
  page,
  world,
}) => {
  await seedBrowserMemberDirectory(page, world);
  await createBrowserMember(page, world, ' Carol ');
  await assertActiveMemberOptions(page, world, 'Carol');
});

test('T187: reactivated referenced member retains the historical UUID in both expense pickers', async ({
  page,
  world,
}) => {
  await seedInactiveReferencedMember(page, world, '小美');
  await reactivateBrowserMember(page, world, '小美');
  await assertActiveMemberOptions(page, world, '小美');
});

import { test, expect } from '../fixtures.js';
import {
  assertDeletedMemberChoices,
  assertDeletedMemberOptions,
} from './deleted-member-options-result.js';
import { seedBrowserMemberDirectory } from './member-directory-fixture.js';
import { seedUnreferencedCarol } from './unreferenced-carol-fixture.js';
import { deleteBrowserMember } from './delete-member.js';

test('T186: member picker oracle rejects deleted IDs, missing survivors and duplicate entries', () => {
  assertDeletedMemberChoices(['alice', 'amy'], 'carol', ['alice', 'amy']);
  expect(() => assertDeletedMemberChoices(['alice', 'carol'], 'carol', ['alice', 'amy'])).toThrow();
  expect(() => assertDeletedMemberChoices(['alice'], 'carol', ['alice', 'amy'])).toThrow();
  expect(() =>
    assertDeletedMemberChoices(['alice', 'amy', 'amy'], 'carol', ['alice', 'amy']),
  ).toThrow();
});

test('T186: deleting unused Carol removes her from the directory and both new-record forms without writes', async ({
  page,
  world,
}) => {
  await seedBrowserMemberDirectory(page, world);
  await seedUnreferencedCarol(page, world);
  await deleteBrowserMember(page, world, 'Carol');
  await assertDeletedMemberOptions(page, world, 'Carol');
});

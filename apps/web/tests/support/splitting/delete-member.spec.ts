import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserMemberDirectory } from './member-directory-fixture.js';
import { seedUnreferencedCarol } from './unreferenced-carol-fixture.js';
import {
  assertSingleMemberDeletion,
  deleteBrowserMember,
  deleteMemberPhrase,
  type BrowserMemberDeletion,
} from './delete-member.js';

test('T154: exact member deletion rejects duplicate writes and wrong stable UUID', () => {
  const state = {
    tripId: 'trip',
    memberId: 'original',
    mutations: [{ method: 'DELETE', path: '/api/trips/trip/members/original', payload: null }],
  } as BrowserMemberDeletion;
  assertSingleMemberDeletion(state);
  expect(() =>
    assertSingleMemberDeletion({ ...state, mutations: [...state.mutations, ...state.mutations] }),
  ).toThrow();
  expect(() => assertSingleMemberDeletion({ ...state, memberId: 'different' })).toThrow();
  expect(() =>
    assertSingleMemberDeletion({
      ...state,
      mutations: [{ ...state.mutations[0]!, method: 'PATCH', payload: '{}' }],
    }),
  ).toThrow();
});

test('T154: isolated When deletes the real unreferenced Carol through confirmation once', async ({
  page,
  world,
}) => {
  await seedBrowserMemberDirectory(page, world);
  await seedUnreferencedCarol(page, world);
  await runIsolatedStep(
    {
      phrase: deleteMemberPhrase,
      input: 'Carol',
      execute: async (context, name) => deleteBrowserMember(page, context, name),
    },
    world,
  );
});

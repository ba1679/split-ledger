import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserMemberDirectory } from './member-directory-fixture.js';
import {
  memberLostResponseStateKey,
  seedBrowserMemberLostResponse,
  type MemberLostResponseState,
} from './member-lost-response-fixture.js';
import {
  assertMemberCreatePayload,
  createBrowserMember,
  createMemberPhrase,
  memberCreateKey,
  type MemberCreate,
} from './create-member.js';

test('T157: member creation requires one reserved UUID and only the intended name', () => {
  const id = randomUUID();
  expect(assertMemberCreatePayload({ id, name: ' Carol ' }, ' Carol ')).toBe(id);
  expect(assertMemberCreatePayload({ id, name: 'Carol' }, ' Carol ')).toBe(id);
  for (const payload of [
    { name: 'Carol' },
    { id: 'new', name: 'Carol' },
    { id, name: 'Amy' },
    { id, name: 'Carol', role: 'owner' },
  ])
    expect(() => assertMemberCreatePayload(payload, ' Carol ')).toThrow();
});

for (const rawName of [' Carol ', ' alice ', 'AMY', 'Bob', 'Carol'])
  test(`T157: real member form submits once preserving ${JSON.stringify(rawName)}`, async ({
    page,
    world,
  }) => {
    const lostResponse = rawName === 'Carol';
    try {
      if (lostResponse) await seedBrowserMemberLostResponse(page, world);
      else await seedBrowserMemberDirectory(page, world);
      await runIsolatedStep(
        {
          phrase: createMemberPhrase,
          input: rawName,
          execute: (context, name) => createBrowserMember(page, context, name),
        },
        world,
      );
      const state = world.get<MemberCreate>(memberCreateKey);
      expect(state.rawName).toBe(rawName);
      expect(state.writes.length).toBeLessThanOrEqual(1);
      expect(state.outcome).toBe(
        lostResponse ? 'unconfirmed' : rawName.trim() === 'Carol' ? 'saved' : 'validation',
      );
    } finally {
      await (
        world.state.get(memberLostResponseStateKey) as MemberLostResponseState | undefined
      )?.restore();
    }
  });

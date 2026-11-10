import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { createCompanion, createMemberPhrase } from './create-member-command.js';
import { seedSplittingMembers, splittingMemberId } from './members-fixture.js';
import { assertRejectedSplittingOperation } from './rejection.js';

test('T047 registers one string parameter for companion creation', () => {
  expect(createMemberPhrase).toBe('owner 新增同行者 {string}');
  expect(createMemberPhrase.match(/\{string\}/g)).toHaveLength(1);
});

test('T047 isolated creation sends raw name and retains the reserved UUID', async ({ world }) => {
  await seedSplittingMembers(world);
  await runIsolatedStep(
    { phrase: createMemberPhrase, input: '  David  ', execute: createCompanion },
    world,
  );
  expect(world.response!.status(), 'Product must provide companion creation').toBe(201);
  const id = world.get<string>('splitting:reservedMemberId');
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(world.get('splitting:memberRequest')).toEqual({ id, name: '  David  ' });
  expect(world.get('splitting:reply')).toMatchObject({
    id,
    name: 'David',
    role: 'companion',
    isActive: true,
  });
  expect(splittingMemberId(world, 'David')).toBe(id);
});

test('T047 isolated conflicting name preserves sources and original aliases', async ({ world }) => {
  await seedSplittingMembers(world);
  const amy = splittingMemberId(world, 'Amy');
  await runIsolatedStep(
    { phrase: createMemberPhrase, input: ' Amy ', execute: createCompanion },
    world,
  );
  await assertRejectedSplittingOperation(world, 'MEMBER_NAME_CONFLICT');
  expect(splittingMemberId(world, 'Amy')).toBe(amy);
  expect([...world.splitting.ids.members.values()]).not.toContain(
    world.get('splitting:reservedMemberId'),
  );
});

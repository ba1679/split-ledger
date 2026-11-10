import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers } from './members-fixture.js';
import {
  disposeOtherDeviceApi,
  readMembersOnAnotherDevice,
} from './cross-device-members-command.js';
import {
  assertCrossDeviceMembers,
  assertStableMemberSet,
  crossDeviceMembersResultPhrase,
} from './cross-device-members-result.js';

test('T071 exact parameter-free registration rejects unstable member projections', () => {
  expect(crossDeviceMembersResultPhrase).toBe('兩個裝置看到同一組穩定成員');
  const expected = ['Alice', 'Amy', 'Bob', 'Carol'].map((name) => ({
    id: name,
    name,
    role: name === 'Alice' ? 'owner' : 'companion',
    isActive: true,
  }));
  expect(() => assertStableMemberSet({ items: [...expected].reverse() }, expected)).not.toThrow();
  expect(() => assertStableMemberSet({ items: expected.slice(0, 3) }, expected)).toThrow();
  expect(() => assertStableMemberSet({ items: [...expected, expected[0]] }, expected)).toThrow();
  for (const changed of [
    { id: 'new-id' },
    { role: 'owner' },
    { name: 'renamed' },
    { isActive: false },
  ]) {
    expect(() =>
      assertStableMemberSet(
        {
          items: expected.map((member, index) =>
            index === 1 ? { ...member, ...changed } : member,
          ),
        },
        expected,
      ),
    ).toThrow();
  }
});

test('T071 isolated Then verifies both owner sessions against unchanged DB identities', async ({
  world,
}) => {
  try {
    await seedSplittingMembers(world);
    await readMembersOnAnotherDevice(world);
    await runIsolatedStep(
      {
        phrase: crossDeviceMembersResultPhrase,
        input: undefined,
        execute: assertCrossDeviceMembers,
      },
      world,
    );
  } finally {
    await disposeOtherDeviceApi(world);
  }
});

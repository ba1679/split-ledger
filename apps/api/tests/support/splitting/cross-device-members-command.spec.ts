import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers } from './members-fixture.js';
import type { Identity } from '../world.js';
import {
  crossDeviceMembersPhrase,
  disposeOtherDeviceApi,
  readMembersOnAnotherDevice,
} from './cross-device-members-command.js';

test('T042 registers the exact parameter-free cross-device member read', () => {
  expect(crossDeviceMembersPhrase).toBe('owner 以另一裝置工作階段讀取旅行成員');
  expect(crossDeviceMembersPhrase).not.toMatch(/[{}]/);
});

test('T042 isolated read creates a separate valid owner session and preserves member sources', async ({
  world,
}) => {
  try {
    await seedSplittingMembers(world);
    const owner = world.users.get('甲')!;
    await runIsolatedStep(
      { phrase: crossDeviceMembersPhrase, input: undefined, execute: readMembersOnAnotherDevice },
      world,
    );
    const session = world.get<Identity>('splitting:otherDeviceSession');
    expect(session.id).toBe(owner.id);
    expect(session.cookie).not.toBe(owner.cookie);
    expect(world.users.get('甲')).toEqual(owner);
    expect(
      world.response!.status(),
      'Product must provide members to the other owner session',
    ).toBe(200);
    expect(await world.response!.json()).toEqual(world.get('splitting:reply'));
  } finally {
    await disposeOtherDeviceApi(world);
  }
});

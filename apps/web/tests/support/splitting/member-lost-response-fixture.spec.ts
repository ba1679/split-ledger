import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import {
  memberLostResponsePhrase,
  memberLostResponseStateKey,
  seedBrowserMemberLostResponse,
  type MemberLostResponseState,
} from './member-lost-response-fixture.js';

test('T122: Carol draft arms loss of the real member POST and blocks reserved-ID verification', async ({
  page,
  world,
}) => {
  try {
    await runIsolatedStep(
      {
        phrase: memberLostResponsePhrase,
        input: undefined,
        execute: async (context) => seedBrowserMemberLostResponse(page, context),
      },
      world,
    );
    const state = world.get<MemberLostResponseState>(memberLostResponseStateKey);
    expect(state.mutations).toEqual([]);
    expect(state.membersBefore.some((row) => row.name === 'Carol')).toBe(false);
    await expect(page.getByRole('textbox', { name: '同行者名稱', exact: true })).toHaveValue(
      'Carol',
    );
  } finally {
    const state = world.state.get(memberLostResponseStateKey) as
      MemberLostResponseState | undefined;
    await state?.restore();
  }
});

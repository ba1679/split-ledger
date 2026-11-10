import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedUnauthorizedSplittingAccount } from './access-fixture.js';
import type { SourceSnapshot } from './types.js';

test('T010: unauthorized login has no ownership despite matching companion name', async ({
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: '分帳旅行另有未獲授權的登入帳號',
      input: undefined,
      execute: seedUnauthorizedSplittingAccount,
    },
    world,
  );
  expect(world.users.get('乙')!.id).not.toBe(world.users.get('甲')!.id);
  expect(world.users.get('乙')!.name).toBe('Amy');
  const snapshot = world.get<SourceSnapshot>('splitting:accessBefore');
  expect(snapshot.expenses).toHaveLength(2);
  expect(snapshot.repayments).toHaveLength(2);
  expect(snapshot.settlements).toHaveLength(1);
  expect(snapshot.adjustments).toHaveLength(2);
  expect(world.get('splitting:accessArrangement')).toMatchObject({
    debtorMemberId: world.splitting.ids.members.get('Bob'),
  });
});

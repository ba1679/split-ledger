import { test, expect } from '../fixtures.js';
import { seedUnauthorizedSplittingAccount } from './access-fixture.js';
import { runIsolatedStep } from './harness.js';
import {
  unauthorizedOperations,
  unauthorizedSplittingRequest,
  requestUnauthorizedSplittingResource,
  type UnauthorizedRequestFixture,
} from './unauthorized-operation.js';

const fixture: UnauthorizedRequestFixture = {
  tripId: 'owner-trip',
  memberId: 'real-member',
  expenseId: 'real-expense',
  repaymentId: 'real-repayment',
  settlementId: 'real-settlement',
  createId: 'reserved-id',
  createRepaymentId: 'reserved-repayment-id',
  view: { accountingRevision: '5', simplifyDebts: false, arrangements: [] },
  arrangement: {
    key: 'owner-key',
    debtorMemberId: 'bob',
    creditorMemberId: 'alice',
    currencyCode: 'JPY',
    amount: { numerator: '100', denominator: '1', minorUnit: 0 },
  },
};
const foreign = {
  id: 'foreign',
  name: 'Amy',
  email: 'foreign@example.test',
  cookie: 'foreign-session',
};

test('T029 dispatches all fourteen contract operations with the unauthorized session and trusted write origin', () => {
  const expected = [
    ['GET', '/members'],
    ['GET', '/members/real-member'],
    ['POST', '/members'],
    ['PATCH', '/members/real-member'],
    ['DELETE', '/members/real-member'],
    ['GET', '/expenses/real-expense'],
    ['PATCH', '/expenses/real-expense'],
    ['DELETE', '/expenses/real-expense'],
    ['GET', '/settlement'],
    ['PATCH', ''],
    ['GET', '/repayments/real-repayment'],
    ['POST', '/repayments'],
    ['GET', '/settlements/real-settlement'],
    ['POST', '/settlements'],
  ];
  expect(unauthorizedOperations).toHaveLength(expected.length);
  unauthorizedOperations.forEach((operation, index) => {
    const request = unauthorizedSplittingRequest(
      fixture,
      foreign,
      'https://trusted.test',
      operation,
    );
    const [method, path] = expected[index]!;
    expect(request.url).toBe(`/api/trips/owner-trip${path}`);
    expect(request.options.method).toBe(method);
    expect(request.options.headers).toEqual({
      Cookie: 'foreign-session',
      ...(method !== 'GET' ? { Origin: 'https://trusted.test' } : {}),
    });
    expect('data' in request.options).toBe(method === 'POST' || method === 'PATCH');
  });
  expect(
    unauthorizedSplittingRequest(fixture, foreign, 'https://trusted.test', '新增結清').options,
  ).toMatchObject({
    data: {
      arrangementKey: 'owner-key',
      accountingRevision: '5',
      expectedAmount: fixture.arrangement.amount,
      repaymentId: 'reserved-repayment-id',
    },
  });
  expect(() =>
    unauthorizedSplittingRequest(fixture, foreign, 'https://trusted.test', 'unknown'),
  ).toThrow();
});

test('T029 isolated When records the authoritative baseline and single real forbidden request', async ({
  world,
}) => {
  await seedUnauthorizedSplittingAccount(world);
  await runIsolatedStep(
    {
      phrase: '非 owner 帳號嘗試 "新增結清" 分帳資源',
      input: '新增結清',
      execute: requestUnauthorizedSplittingResource,
    },
    world,
  );
  expect(world.splitting.snapshot).toBeDefined();
  expect(world.get('splitting:requestOwnerId')).toBe(world.users.get('乙')!.id);
  expect(world.response!.status()).toBe(404);
  expect(await world.response!.json()).toMatchObject({ code: 'NOT_FOUND' });
});

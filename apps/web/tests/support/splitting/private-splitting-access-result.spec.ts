import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { seedAnonymousBrowser } from './anonymous-browser-fixture.js';
import { seedOtherAccountBrowser } from './other-account-browser-fixture.js';
import { directSplittingAccess, type ProtectedAccessReply } from './direct-splitting-access.js';
import {
  assertNoProtectedBrowserText,
  assertPrivateAccessReply,
  assertPrivateSplittingAccess,
  type ProtectedBrowserFacts,
} from './private-splitting-access-result.js';
import { accessBrowserStateKey, type AccessBrowserState } from './other-account-browser-fixture.js';

const facts: ProtectedBrowserFacts = {
  identities: ['owner-member-uuid', 'companion-amy-uuid', 'expense-uuid'],
  names: ['Alice', 'Bob'],
  items: ['點心'],
  currencies: ['JPY'],
  amounts: ['100', '33'],
};

test('T192: privacy oracle permits actor Amy and public errors but rejects member, expense and monetary leaks', () => {
  assertNoProtectedBrowserText('Amy 找不到這個旅行', facts);
  assertNoProtectedBrowserText('1000', facts);
  for (const leaked of [
    'Alice',
    'Bob',
    '點心',
    'JPY 33.33',
    'JPY 100',
    '100',
    'companion-amy-uuid',
    'expense-uuid',
  ])
    expect(() => assertNoProtectedBrowserText(leaked, facts)).toThrow();
  const reply: ProtectedAccessReply = {
    path: '/api/trips/trip',
    status: 404,
    origin: 'page',
    body: { code: 'NOT_FOUND', message: '找不到這個旅行', requestId: 'public-request' },
  };
  assertPrivateAccessReply(reply, 404, facts);
  assertPrivateAccessReply(
    {
      ...reply,
      body: {
        code: 'NOT_FOUND',
        message: '找不到這個旅行',
        requestId: '0a33b7ff-9e12-4bde-8c98-deadbeef0000',
      },
    },
    404,
    facts,
  );
  assertPrivateAccessReply(
    { ...reply, status: 401, body: { code: 'UNAUTHENTICATED', message: '請先登入' } },
    401,
    facts,
  );
  for (const body of [
    {
      code: 'NOT_FOUND',
      message: '找不到這個旅行',
      members: [{ id: 'companion-amy-uuid', name: 'Amy' }],
    },
    { code: 'NOT_FOUND', message: '找不到點心' },
    { code: 'NOT_FOUND', message: '尚欠 33' },
    { code: 'NOT_FOUND', message: '找不到這個旅行', field: '33' },
    { code: 'NOT_FOUND', message: '找不到這個旅行', requestId: 'companion-amy-uuid' },
    { code: 'NOT_FOUND', message: '找不到這個旅行', amount: '100' },
  ])
    expect(() => assertPrivateAccessReply({ ...reply, body }, 404, facts)).toThrow();
  expect(() => assertPrivateAccessReply({ ...reply, status: 200 }, 404, facts)).toThrow();
});

for (const actor of ['anonymous', 'other-account'] as const) {
  test(`T192: ${actor} cannot see protected ledger data or reach a keyboard editor`, async ({
    browser,
    page,
    world,
  }) => {
    try {
      await seedBrowserSplittingExpenses(page, world, [
        { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
      ]);
      await (actor === 'anonymous' ? seedAnonymousBrowser : seedOtherAccountBrowser)(
        browser,
        world,
      );
      await directSplittingAccess(world);
      await assertPrivateSplittingAccess(world);
    } finally {
      await (world.state.get(accessBrowserStateKey) as AccessBrowserState | undefined)?.dispose();
    }
  });
}

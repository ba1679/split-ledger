import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import type { BrowserSplittingSnapshot } from './fixture.js';
import { createBrowserMember, type MemberCreate } from './create-member.js';
import {
  memberLostResponseStateKey,
  seedBrowserMemberLostResponse,
  type MemberLostResponseState,
} from './member-lost-response-fixture.js';
import {
  assertUnconfirmedMember,
  assertUnconfirmedMemberAuthority,
  assertUnconfirmedMemberDraft,
  unconfirmedMemberPhrase,
} from './unconfirmed-member-result.js';

function committedCreation() {
  const tripId = randomUUID();
  const id = randomUUID();
  const before: BrowserSplittingSnapshot = {
    sources: {
      trips: [],
      members: [],
      expenses: [],
      shares: [],
      repayments: [],
      settlements: [],
      adjustments: [],
    },
    expenses: { items: [], totalCount: 0, nextCursor: null },
    settlement: { accountingRevision: '0', simplifyDebts: false, balances: [], arrangements: [] },
    repayments: { items: [] },
    totals: { totals: [] },
  };
  const after = structuredClone(before);
  after.sources = { ...after.sources, members: [{ id, name: 'Carol' }] };
  after.settlement.accountingRevision = '1';
  const members = [{ id, tripId, name: 'Carol', role: 'companion' as const, isActive: true }];
  const body = { id, name: 'Carol' };
  const action: MemberCreate = {
    tripId,
    rawName: 'Carol',
    memberId: id,
    before,
    writes: [{ method: 'POST', path: `/api/trips/${tripId}/members`, body }],
    status: null,
    response: null,
    outcome: 'unconfirmed',
  };
  const loss: MemberLostResponseState = {
    tripId,
    before,
    membersBefore: [],
    commandId: id,
    mutations: [{ id, body, url: `http://localhost/api/trips/${tripId}/members` }],
    verificationIds: [id],
    persisted: { status: 201, response: members[0]!, snapshot: after, members },
    mutationFinished: Promise.resolve(),
    restore: async () => {},
  };

  return { action, loss, after, members };
}

test('T189: real commitment is distinct from unknown browser outcome and only original UUID is verified', () => {
  const valid = committedCreation();
  assertUnconfirmedMemberAuthority(valid.action, valid.loss, valid.after, valid.members);
  for (const mutate of [
    (state: ReturnType<typeof committedCreation>) => {
      state.action.outcome = 'saved';
    },
    (state: ReturnType<typeof committedCreation>) => {
      state.loss.verificationIds = [];
    },
    (state: ReturnType<typeof committedCreation>) => {
      state.loss.verificationIds.push(randomUUID());
    },
    (state: ReturnType<typeof committedCreation>) => {
      state.loss.mutations.push(state.loss.mutations[0]!);
    },
    (state: ReturnType<typeof committedCreation>) => {
      state.loss.persisted = undefined;
    },
    (state: ReturnType<typeof committedCreation>) => {
      state.members.push({ ...state.members[0]!, id: randomUUID() });
    },
    (state: ReturnType<typeof committedCreation>) => {
      state.after.sources = { ...state.after.sources, repayments: [{ id: randomUUID() }] };
    },
  ]) {
    const state = committedCreation();
    mutate(state);
    expect(() =>
      assertUnconfirmedMemberAuthority(state.action, state.loss, state.after, state.members),
    ).toThrow();
  }
});

test('T189: retained Carol draft must not claim either definite success or definite failure', async ({
  page,
}) => {
  const commandId = randomUUID();
  await page.setContent(
    `<form data-command-id="${commandId}"><label for="name">同行者名稱</label><input id="name" value="Carol"><button>新增同行者</button></form><p>保存結果尚未確認</p>`,
  );
  await assertUnconfirmedMemberDraft(page, commandId);
  for (const claim of ['新增成功', '保存失敗']) {
    await page.locator('body').evaluate((body, text) => {
      const node = document.createElement('p');
      node.id = 'claim';
      node.textContent = text;
      body.append(node);
    }, claim);
    await expect(assertUnconfirmedMemberDraft(page, commandId)).rejects.toThrow();
    await page.locator('#claim').evaluate((node) => node.remove());
  }
  await page
    .locator('form')
    .evaluate((form, id) => form.setAttribute('data-command-id', id), randomUUID());
  await expect(assertUnconfirmedMemberDraft(page, commandId)).rejects.toThrow();
});

test('T189: one committed Carol creation retains unknown outcome without retry or restored verification', async ({
  page,
  world,
}) => {
  try {
    await seedBrowserMemberLostResponse(page, world);
    await createBrowserMember(page, world, 'Carol');
    await runIsolatedStep(
      {
        phrase: unconfirmedMemberPhrase,
        input: undefined,
        execute: (context) => assertUnconfirmedMember(page, context),
      },
      world,
    );
  } finally {
    await (
      world.state.get(memberLostResponseStateKey) as MemberLostResponseState | undefined
    )?.restore();
  }
});

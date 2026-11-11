import { expect, type Page, type Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  seedBrowserMemberDirectory,
  type BrowserDirectoryMember,
} from './member-directory-fixture.js';

export const memberLostResponsePhrase = '同行者新增表單填入 Carol 且保存回應遺失與查證暫不可用';

export const memberLostResponseStateKey = 'splitting:browserMemberLostResponse';

export interface MemberLostResponseState {
  tripId: string;
  before: BrowserSplittingSnapshot;
  membersBefore: BrowserDirectoryMember[];
  mutations: { id: string; body: Record<string, unknown>; url: string }[];
  verificationIds: string[];
  commandId?: string;
  persisted?: {
    status: number;
    response: Record<string, unknown>;
    snapshot: BrowserSplittingSnapshot;
    members: BrowserDirectoryMember[];
  };
  failure?: unknown;
  mutationFinished: Promise<void>;
  restore(): Promise<void>;
}

/** Drop only a genuinely committed member response; API authority reads bypass page routes. */
export async function installMemberLostResponse(
  page: Page,
  world: LedgerWorld,
): Promise<MemberLostResponseState> {
  const tripId = splittingTripId(world);
  const memberPath = `/api/trips/${tripId}/members`;
  const before = await readBrowserSplittingSnapshot(world);
  const directory = await callApi(world, 'GET', memberPath);
  expect(directory.status()).toBe(200);
  const membersBefore = ((await directory.json()) as { items: BrowserDirectoryMember[] }).items;
  expect(membersBefore.some((row) => row.name === 'Carol')).toBe(false);
  let finish!: () => void;
  const mutationFinished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const pattern = `**${memberPath}**`;
  const state: MemberLostResponseState = {
    tripId,
    before,
    membersBefore,
    mutations: [],
    verificationIds: [],
    mutationFinished,
    restore: async () => {
      await page.unroute(pattern, handler);
      expect(
        state.failure,
        'Real saved-response interception must complete without assertion failures',
      ).toBeUndefined();
    },
  };
  const handler = async (route: Route): Promise<void> => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (
      request.method() === 'GET' &&
      state.commandId &&
      path === `${memberPath}/${state.commandId}`
    ) {
      state.verificationIds.push(state.commandId);
      await route.abort('failed');

      return;
    }
    if (request.method() !== 'POST' || path !== memberPath) {
      await route.fallback();

      return;
    }
    const body = request.postDataJSON() as Record<string, unknown>;
    const id = String(body.id);
    state.mutations.push({ id, body: structuredClone(body), url: request.url() });
    try {
      expect(state.mutations, 'Unknown outcomes must never cause a second POST').toHaveLength(1);
      expect(id, 'UI must reserve a member UUID before sending').toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(body.name).toBe('Carol');
      state.commandId = id;
      // Forward exactly once to the actual product; no synthetic response or database writes.
      const response = await route.fetch({ maxRetries: 0, maxRedirects: 0 });
      expect(response.status(), 'Response loss applies only after the real POST succeeds').toBe(
        201,
      );
      const saved = (await response.json()) as Record<string, unknown>;
      expect(saved).toMatchObject({ id, tripId, name: 'Carol', role: 'companion', isActive: true });
      const snapshot = await readBrowserSplittingSnapshot(world);
      const memberReply = await callApi(world, 'GET', memberPath);
      expect(memberReply.status()).toBe(200);
      const members = ((await memberReply.json()) as { items: BrowserDirectoryMember[] }).items;
      expect(members).toHaveLength(membersBefore.length + 1);
      expect(members.filter((row) => row.name === 'Carol')).toEqual([
        expect.objectContaining({ id }),
      ]);
      expect(snapshot.sources.members.filter((row) => row.id === id)).toHaveLength(1);
      expect(snapshot.sources.members.filter((row) => row.id !== id)).toEqual(
        before.sources.members,
      );
      for (const table of [
        'expenses',
        'shares',
        'repayments',
        'settlements',
        'adjustments',
      ] as const)
        expect(snapshot.sources[table], `Member creation must preserve ${table}`).toEqual(
          before.sources[table],
        );
      expect(BigInt(snapshot.settlement.accountingRevision)).toBe(
        BigInt(before.settlement.accountingRevision) + 1n,
      );
      state.persisted = { status: response.status(), response: saved, snapshot, members };
      world.set('splitting:browserMemberCommandId', id);
    } catch (error) {
      state.failure = error;
    } finally {
      // The browser only observes a transport failure after authority checks finish.
      await route.abort('failed');
      finish();
    }
  };
  await page.route(pattern, handler);
  world.set(memberLostResponseStateKey, state);

  return state;
}

export async function seedBrowserMemberLostResponse(page: Page, world: LedgerWorld): Promise<void> {
  await seedBrowserMemberDirectory(page, world);
  await expect(page.getByRole('button', { name: '新增同行者', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: '同行者名稱', exact: true }).fill('Carol');
  await installMemberLostResponse(page, world);
}

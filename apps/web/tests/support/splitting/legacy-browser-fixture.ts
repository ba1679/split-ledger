import { expect, type Page, type Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  expenseAuthorityWorld,
  seedMigratedLegacyExpense,
  type LegacySplittingContext,
} from '../../../../api/tests/support/splitting/legacy-fixture.js';
import { login } from '../browser.js';
import { browserSplittingStateKey, readBrowserSplittingSnapshot } from './fixture.js';

export const legacyBrowserExpensePhrase = 'Phase 1A 已有 2027-01-15 的 TWD 8000 機票';
const proxyKey = 'splitting:legacyBrowserProxy';

/** Forward actual HTTP requests and responses to the app backed by the upgraded database. */
export async function seedBrowserMigratedLegacyExpense(page: Page, world: LedgerWorld) {
  await seedMigratedLegacyExpense(world);
  const authority = expenseAuthorityWorld(world);
  const webOrigin = world.get<string>('webOrigin');
  authority.set('webOrigin', webOrigin);
  const pattern = `${webOrigin}/api/**`;
  const handler = async (route: Route) => {
    const request = route.request();
    const original = new URL(request.url());
    try {
      const response = await route.fetch({
        url: `${authority.origin}${original.pathname}${original.search}`,
      });
      // No substituted body/status: these are the real migrated app's response bytes.
      await route.fulfill({ response });
    } catch (error) {
      // React may cancel an obsolete read while its real API forwarding is in
      // flight. Only an observed browser cancellation permits a handled route.
      if (
        error instanceof Error &&
        /Route is already handled/.test(error.message) &&
        /ERR_ABORTED|cancelled|canceled|NS_BINDING_ABORTED/i.test(
          request.failure()?.errorText ?? '',
        )
      )
        return;

      throw error;
    }
  };
  await page.route(pattern, handler);
  world.set(proxyKey, { pattern, handler });
  const initial = await readBrowserSplittingSnapshot(authority);
  expect(initial.expenses.items).toHaveLength(1);
  expect(initial.expenses.items[0]).toMatchObject({
    id: world.get<Record<string, unknown>>('splitting:legacyExpenseBefore').id,
    item: '機票',
    amount: '8000.00',
    currencyCode: 'TWD',
    minorUnit: 2,
    spentOn: '2027-01-15',
    category: null,
    payerMemberId: authority.splitting.ids.members.get('Alice'),
  });
  expect(initial.expenses.items[0]!.shares).toEqual([
    {
      memberId: authority.splitting.ids.members.get('Alice'),
      amount: { numerator: '800000', denominator: '1', minorUnit: 2 },
    },
  ]);
  for (const target of [world, authority]) {
    target.set(browserSplittingStateKey, initial);
    target.set('splitting:sourceSnapshot', initial.sources);
    target.set('splitting:initialRevision', initial.settlement.accountingRevision);
    target.set('splitting:revision', initial.settlement.accountingRevision);
  }
  await login(page, authority);
}

export async function disposeBrowserMigratedLegacyExpense(page: Page, world: LedgerWorld) {
  if (world.state.has(proxyKey)) {
    // Scenario teardown must finish in-flight migrated API forwarding before
    // disposing its app/database; removing routes immediately races fulfillment.
    await page.unrouteAll({ behavior: 'wait' });
    world.state.delete(proxyKey);
  }
  if (world.state.has('splitting:legacyContext')) {
    await world.get<LegacySplittingContext>('splitting:legacyContext').dispose();
    world.state.delete('splitting:legacyContext');
  }
}

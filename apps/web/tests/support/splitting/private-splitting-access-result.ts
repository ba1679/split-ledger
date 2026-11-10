import { expect, type Page, type Request } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  directSplittingAccessKey,
  type DirectSplittingAccess,
  type ProtectedAccessReply,
} from './direct-splitting-access.js';
import { readBrowserSplittingSnapshot } from './fixture.js';

export const privateSplittingAccessResultPhrase = '畫面不洩漏同行者或帳務且不提供編輯能力';

export interface ProtectedBrowserFacts {
  identities: readonly string[];
  names: readonly string[];
  items: readonly string[];
  currencies: readonly string[];
  amounts: readonly string[];
}

/** Match complete numeric tokens, so an unrelated 1000 is not mistaken for amount 100. */
export function assertNoProtectedBrowserText(text: string, facts: ProtectedBrowserFacts): void {
  for (const value of [...facts.identities, ...facts.names, ...facts.items, ...facts.currencies]) {
    if (value)
      expect(
        text,
        `Protected ledger value must not reach the unauthorized view: ${value}`,
      ).not.toContain(value);
  }
  for (const amount of facts.amounts) {
    const escaped = amount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(
      text,
      `Protected monetary amount ${amount} must not reach the unauthorized view`,
    ).not.toMatch(new RegExp(String.raw`(?<![\d.])${escaped}(?![\d.])`));
  }
}

/** These are only protected trip responses. The actor's own get-session is intentionally excluded. */
export function assertPrivateAccessReply(
  reply: ProtectedAccessReply,
  expectedStatus: 401 | 404,
  facts: ProtectedBrowserFacts,
): void {
  expect(reply.status, 'Protected reads must deny access, not return a successful ledger DTO').toBe(
    expectedStatus,
  );
  expect(reply.body).toMatchObject({
    code: expectedStatus === 401 ? 'UNAUTHENTICATED' : 'NOT_FOUND',
    message: expect.any(String),
  });
  const body = reply.body as Record<string, unknown>;
  for (const [key, value] of Object.entries(body)) {
    expect(
      ['code', 'message', 'field', 'requestId'],
      'Denied trip replies expose only the public error contract',
    ).toContain(key);
    expect(typeof value).toBe('string');
  }
  // requestId is an opaque public trace value: coincidental digits are not a monetary leak.
  // Every field still undergoes protected identity/name/item/currency checks.
  assertNoProtectedBrowserText(JSON.stringify(body), { ...facts, amounts: [] });
  assertNoProtectedBrowserText(`${String(body.message)} ${String(body.field ?? '')}`, facts);
}

/** Independent half-up display oracle, including the unsigned form used beside direction labels. */
function visibleAmount(amount: ExactAmount): string {
  const numerator = BigInt(amount.numerator);
  const magnitude = numerator < 0n ? -numerator : numerator;
  const divisor = BigInt(amount.denominator) * 10n ** BigInt(amount.minorUnit);
  const cents = (magnitude * 100n * 2n + divisor) / (divisor * 2n);

  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`.replace(/\.?0+$/, '');
}

const businessAction =
  /新增同行者|新增支出|新增還款|獨立還款|記錄還款|結清|儲存|保存|停用|刪除|修改|編輯/;

async function assertNoUsableProtectedEditor(page: Page, tripId: string): Promise<void> {
  // Read hidden and disabled controls too, but only enabled/visible ones are actionable.
  const controls = page.locator(
    'button, a, input, select, textarea, [contenteditable="true"], [role="button"], [role="link"]',
  );
  for (const control of await controls.all()) {
    if (!(await control.isVisible()) || !(await control.isEnabled())) continue;
    const metadata = await control.evaluate((element) => ({
      label: `${element.textContent ?? ''} ${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('title') ?? ''}`,
      href: element.getAttribute('href') ?? '',
      editable: element.matches(
        'input:not([type="hidden"]), select, textarea, [contenteditable="true"]',
      ),
    }));
    expect(
      metadata.label,
      'Unauthorized view must not offer a business mutation control',
    ).not.toMatch(businessAction);
    expect(metadata.href, 'Unauthorized view must not link to a protected trip editor').not.toMatch(
      new RegExp(
        String.raw`/trips/${tripId}/(?:members|expenses|repayments|settlements)(?:/|\?|$)`,
      ),
    );
    expect(
      metadata.editable,
      'Unauthorized splitting view must not contain usable draft fields',
    ).toBe(false);
  }
  // Tab through every interactive position without clicking, pressing Enter, or creating a write.
  // A hidden keyboard-only editor is caught when it becomes focused and visible.
  const count = await controls.count();
  for (let index = 0; index <= count; index += 1) {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    if ((await focused.count()) === 0) continue;
    expect((await focused.getAttribute('href')) ?? '').not.toMatch(
      new RegExp(
        String.raw`/trips/${tripId}/(?:members|expenses|repayments|settlements)(?:/|\?|$)`,
      ),
    );
    expect(
      `${(await focused.textContent()) ?? ''} ${(await focused.getAttribute('aria-label')) ?? ''}`,
    ).not.toMatch(businessAction);
    expect(
      await focused.evaluate((element) =>
        element.matches('input, select, textarea, [contenteditable="true"]'),
      ),
    ).toBe(false);
  }
}

export async function assertPrivateSplittingAccess(world: LedgerWorld): Promise<void> {
  const result = world.get<DirectSplittingAccess>(directSplittingAccessKey);
  const { browser, replies, writes } = result;
  const { page, actor, ownerSnapshot, tripId } = browser;
  expect(page.context()).toBe(browser.context);
  expect(actor?.id).not.toBe(browser.owner.id);
  const facts: ProtectedBrowserFacts = {
    identities: [
      browser.owner.id,
      browser.owner.email,
      ...ownerSnapshot.sources.members.map((member) => String(member.id)),
      ...ownerSnapshot.expenses.items.map((expense) => expense.id),
      ...ownerSnapshot.repayments.items.map((repayment) => String(repayment.id)),
    ],
    // An unrelated authenticated user can legitimately see their own name Amy in the shell.
    // Their auth ID is distinct; owner member IDs, balances and DTOs remain prohibited.
    names: ownerSnapshot.sources.members
      .map((member) => String(member.name))
      .filter((name) => name !== actor?.name),
    items: [
      ...ownerSnapshot.expenses.items.map((expense) => expense.item),
      ...ownerSnapshot.sources.trips.map((trip) => String(trip.name)),
    ],
    currencies: ownerSnapshot.expenses.items.map((expense) => expense.currencyCode),
    amounts: [
      ...new Set([
        ...ownerSnapshot.expenses.items.map((expense) => expense.amount),
        ...ownerSnapshot.expenses.items.flatMap((expense) =>
          expense.shares.map((share) => visibleAmount(share.amount)),
        ),
        ...ownerSnapshot.settlement.balances.map((balance) => visibleAmount(balance.netAmount)),
        ...ownerSnapshot.settlement.arrangements.map((arrangement) =>
          visibleAmount(arrangement.amount),
        ),
      ]),
    ].filter((amount) => amount !== '0'),
  };
  expect(
    replies,
    'The direct visit must retain real protected API denial evidence',
  ).not.toHaveLength(0);
  for (const reply of replies) {
    expect(
      reply.path === `/api/trips/${tripId}` || reply.path.startsWith(`/api/trips/${tripId}/`),
    ).toBe(true);
    assertPrivateAccessReply(reply, actor ? 404 : 401, facts);
  }
  expect(writes).toEqual([]);
  const laterWrites: string[] = [];
  const recordWrite = (request: Request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())
    )
      laterWrites.push(`${request.method()} ${new URL(request.url()).pathname}`);
  };
  page.on('request', recordWrite);
  try {
    assertNoProtectedBrowserText((await page.locator('body').textContent()) ?? '', facts);
    assertNoProtectedBrowserText(await page.locator('body').ariaSnapshot(), facts);
    const values = await page
      .locator(
        'input, select, textarea, [aria-label], [title], [data-member-id], [data-expense-id]',
      )
      .evaluateAll((elements) =>
        elements
          .map((element) =>
            [
              'value' in element ? String(element.value) : '',
              element.getAttribute('aria-label') ?? '',
              element.getAttribute('title') ?? '',
              element.getAttribute('data-member-id') ?? '',
              element.getAttribute('data-expense-id') ?? '',
            ].join(' '),
          )
          .join('\n'),
      );
    assertNoProtectedBrowserText(values, facts);
    await assertNoUsableProtectedEditor(page, tripId);
    expect(laterWrites, 'Keyboard inspection must not submit any business mutation').toEqual([]);
    expect(
      await readBrowserSplittingSnapshot(world),
      'Owner DB and all authority projections must remain unchanged',
    ).toEqual(ownerSnapshot);
  } finally {
    page.off('request', recordWrite);
  }
}

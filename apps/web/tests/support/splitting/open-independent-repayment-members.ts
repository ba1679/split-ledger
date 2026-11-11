import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  openRepaymentMembers,
  openedRepaymentMembersKey,
  type OpenedRepaymentMembers,
} from './open-repayment-members.js';
import { readBrowserSplittingSnapshot } from './fixture.js';

export const openIndependentRepaymentMembersPhrase = 'owner 開啟獨立還款成員選單';

export const independentRepaymentMembersKey = 'splitting:independentRepaymentMembers';

export interface IndependentRepaymentMembers extends OpenedRepaymentMembers {
  choices: Record<'payer' | 'payee', { id: string; name: string; disabled: boolean }[]>;
}

/** Open both actual member controls without selecting a member or submitting a draft. */
export async function openIndependentRepaymentMembers(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const writes: string[] = [];
  const onRequest = (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/') && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()))
      writes.push(`${request.method()} ${path}`);
  };
  page.on('request', onRequest);
  try {
    // This existing directory opener waits for the true current-trip members response.
    await openRepaymentMembers(page, world);
    const opened = world.get<OpenedRepaymentMembers>(openedRepaymentMembersKey);
    const choices: IndependentRepaymentMembers['choices'] = { payer: [], payee: [] };
    for (const [role, label] of [
      ['payer', '付款人'],
      ['payee', '收款人'],
    ] as const) {
      const control = page.getByRole('combobox', { name: label, exact: true });
      const originalValue = await control.inputValue();
      await control.focus();
      await control.press('Space');
      await control.press('Escape');
      await expect(control).toBeFocused();
      await expect(control).toHaveValue(originalValue);
      choices[role] = await control.locator('option').evaluateAll((options) =>
        options.map((option) => ({
          id: (option as HTMLOptionElement).value,
          name: option.textContent?.trim() ?? '',
          disabled: (option as HTMLOptionElement).disabled,
        })),
      );
    }
    const after = await readBrowserSplittingSnapshot(world);
    expect(after, 'Opening member menus must not change the current ledger').toEqual(opened.before);
    expect(writes, 'Opening both member menus must not write').toEqual([]);
    world.set(independentRepaymentMembersKey, {
      ...opened,
      writes,
      after,
      choices,
    } satisfies IndependentRepaymentMembers);
  } finally {
    page.off('request', onRequest);
  }
}

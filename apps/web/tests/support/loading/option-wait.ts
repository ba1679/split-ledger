import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { arrangeInitialRead, awaitInitialReadHeld, type InitialRead } from './initial-read.js';
import { isCancelledRead } from './query-attempts.js';
import { managementUI } from '../trips/management-fixture.js';

export interface OptionDraft {
  item: string;
  amount: string;
  date: string;
}

export function optionRegion(page: Page, option: string) {
  return page
    .getByRole('region', { name: new RegExp(`^${option}(?:選項)?$`) })
    .or(page.getByRole('group', { name: new RegExp(`^${option}(?:選項)?$`) }));
}

export async function assertOptionDraft(world: LedgerWorld): Promise<void> {
  const draft = world.get<OptionDraft>('loading:optionDraft'),
    page = managementUI(world).page;
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue(draft.item);
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue(draft.amount);
  await expect(page.getByRole('textbox', { name: '支出日期', exact: true })).toHaveValue(
    draft.date,
  );
}

export async function arrangeOptionWait(
  page: Page,
  world: LedgerWorld,
  option: string,
): Promise<void> {
  expect(['幣別', '分類', '分攤成員']).toContain(option);
  await arrangeInitialRead(page, world, '新增支出', option, '延遲');
  const state = world.get<InitialRead>('loading:initial'),
    ui = managementUI(world);
  await page.goto(state.route, { waitUntil: 'domcontentloaded' });
  await awaitInitialReadHeld(world);
  await expect
    .poll(
      () =>
        [...ui.pending].filter((read) => {
          const url = new URL(read.url());

          return `${url.pathname}${url.search}` !== state.query;
        }).length,
    )
    .toBe(0);
  await page.getByLabel('支出項目', { exact: true }).fill('選項恢復後的點心');
  await page.getByLabel('金額', { exact: true }).fill('500');
  const draft: OptionDraft = {
    item: '選項恢復後的點心',
    amount: '500',
    date: await page.getByRole('textbox', { name: '支出日期', exact: true }).inputValue(),
  };
  world.set('loading:optionDraft', draft);
  for (const read of ui.reads.filter((read) => new URL(read.url()).pathname !== state.query)) {
    if (isCancelledRead(read)) continue;
    const response = await read.response();
    expect(response?.status()).toBe(200);
    expect(await response!.finished()).toBeNull();
  }
  expect(state.finished).toBe(0);
  expect(ui.writes.length).toBe(0);
}

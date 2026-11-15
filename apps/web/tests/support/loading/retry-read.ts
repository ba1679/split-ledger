import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { BackgroundRead } from './background-fixture.js';
import type { InitialRead } from './initial-read.js';
import { initialContentRegion } from './initial-skeleton.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function retryRead(world: LedgerWorld): Promise<void> {
  const ui = managementUI(world),
    page = ui.page,
    urlBefore = page.url();
  expect(ui.writes.length).toBe(0);
  if (world.state.has('loading:background')) {
    const state = world.get<BackgroundRead>('loading:background');
    expect(state.result).toBe('成功');
    expect(state.released).toBe(true);
    const start = state.requests.length;
    expect(start).toBe(1);
    const region = page.getByRole('region', { name: '支出清單', exact: true });
    const retry = region.getByRole('button', { name: /^(重新更新清單|重新嘗試|重試)$/ });
    await expect(retry).toBeEnabled();
    await retry.click();
    await expect.poll(() => state.requests.length).toBe(start + 2);
    await waitForManagementReads(ui);
    const requests = state.requests.slice(start);
    expect(requests.length).toBe(2);
    for (const [index, request] of requests.entries()) {
      expect(new URL(request.url()).searchParams.get('cursor')).toBe(
        index === 0 ? null : state.pagination.cursor,
      );
      const response = await request.response();
      expect(response?.status()).toBe(200);
      expect(await response!.finished()).toBeNull();
      expect(await response!.json()).toEqual(state.expectedPages[index]);
    }
    expect(state.finished).toBe(start + 2);
    expect(state.errors.map(String)).toEqual([]);
    world.set('loading:retryRead', {
      kind: 'background',
      requestStart: start,
      requests: requests.length,
    });
  } else {
    const state = world.get<InitialRead>('loading:initial');
    expect(state.result).toBe('成功');
    expect(state.released).toBe(true);
    const start = ui.reads.length;
    const retry = initialContentRegion(page, state).getByRole('button', {
      name: /^(重新嘗試|重試|重新取得旅行清單)$/,
    });
    await expect(retry).toBeEnabled();
    await retry.click();
    const requests = () =>
      ui.reads.slice(start).filter((request) => {
        const url = new URL(request.url());

        return `${url.pathname}${url.search}` === state.query;
      });
    await expect.poll(() => requests().length).toBe(1);
    const response = await requests()[0]!.response();
    expect(response?.status()).toBe(200);
    expect(await response!.finished()).toBeNull();
    expect(await response!.json()).toEqual(state.authority);
    await waitForManagementReads(ui);
    expect(requests().length).toBe(1);
    world.set('loading:retryRead', {
      kind: 'initial',
      requestStart: start,
      requests: requests().length,
    });
  }
  await expect(page).toHaveURL(urlBefore);
  expect(ui.writes.length).toBe(0);
}

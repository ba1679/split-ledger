import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { PaginationRead } from './pagination-fixture.js';
import { managementUI } from '../trips/management-fixture.js';

export async function loadMore(world: LedgerWorld): Promise<void> {
  const state = world.get<PaginationRead>('loading:pagination');
  expect(state.requests.length).toBe(0);
  expect(state.arrived).toBe(0);
  await state.control.scrollIntoViewIfNeeded();
  state.box = (await state.control.boundingBox())!;
  expect(state.box).not.toBeNull();
  await state.control.click();
  await expect.poll(() => state.arrived).toBe(1);
  expect(state.requests.length).toBe(1);
  const url = new URL(state.requests[0]!.url());
  expect(url.pathname).toBe(`/api/trips/${state.tripId}/expenses`);
  expect(url.searchParams.get('cursor')).toBe(state.cursor);
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  expect(managementUI(world).writes.length).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
}

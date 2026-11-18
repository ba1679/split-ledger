import { assertSkeletonLayout } from './skeleton-layout.js';
import { expect, type Locator, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../api/tests/support/trip-management/preservation.js';
import { managementUI } from '../trips/management-fixture.js';
import { awaitInitialReadHeld, type InitialRead } from './initial-read.js';

const regionNames: Record<string, RegExp> = {
  一般旅行: /一般旅行|旅行清單/,
  已移入垃圾桶的旅行: /垃圾桶|已移入垃圾桶的旅行/,
  旅行資料: /旅行資料/,
  各幣別總額: /分幣別總額|各幣別總額/,
  支出清單: /支出清單/,
  該筆支出與分攤: /支出詳情|該筆支出與分攤/,
  既有支出表單資料: /支出表單|既有支出表單資料/,
  分類清單: /分類清單/,
  同行者清單: /旅行成員|同行者清單/,
  付款安排: /付款安排/,
  還款所需旅行與成員資料: /還款.*(?:表單|資料)/,
  目前待結清安排: /結清.*(?:表單|安排)/,
};

/** Select the user-facing content boundary, rather than a page-wide loading indicator. */
export function initialContentRegion(page: Page, state: InitialRead): Locator {
  const named = page.getByRole('region', { name: regionNames[state.content] });
  const form = page.getByRole('form', { name: regionNames[state.content] });

  return named.or(form);
}

export async function assertInitialSkeleton(world: LedgerWorld): Promise<void> {
  const state = world.get<InitialRead>('loading:initial'),
    page = managementUI(world).page;
  await awaitInitialReadHeld(world);
  expect(state.exchanges.length).toBeGreaterThan(0);
  expect(state.released).toBe(false);
  expect(state.finished).toBe(0);
  const region = initialContentRegion(page, state);
  await expect(region).toBeVisible();
  await expect(region).toHaveAttribute('aria-busy', 'true');
  const status = region.getByRole('status');
  await expect(status).toHaveCount(1);
  await expect(status).toHaveAccessibleName(/\S/);
  const structure = await region.evaluate((element) => {
    const focusable = [...element.querySelectorAll('[aria-hidden="true"]')]
      .flatMap((skeleton) => [
        skeleton,
        ...skeleton.querySelectorAll('a[href],button,input,select,textarea,[tabindex]'),
      ])
      .filter(
        (node) => node instanceof HTMLElement && node.tabIndex >= 0 && !node.matches(':disabled'),
      );
    const shapes = [...element.querySelectorAll('[aria-hidden="true"], [aria-hidden="true"] *')]
      .filter((node) => {
        const box = node.getBoundingClientRect(),
          style = getComputedStyle(node);

        return (
          box.width >= 12 &&
          box.height >= 4 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          (style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none')
        );
      })
      .map((node) => {
        const box = node.getBoundingClientRect();

        return { x: box.x, y: box.y, width: box.width, height: box.height };
      });

    return { focusable: focusable.length, shapes };
  });
  expect(structure.focusable, 'Skeleton shapes cannot enter keyboard order').toBe(0);
  expect(
    structure.shapes.length,
    'A structural placeholder requires multiple visible shapes',
  ).toBeGreaterThanOrEqual(2);
  expect(
    new Set(structure.shapes.map((shape) => Math.round(shape.y))).size,
    'The skeleton must have more structure than one flat bar',
  ).toBeGreaterThanOrEqual(2);
  assertSkeletonLayout(state.layout, structure.shapes);
  await expect(region).not.toContainText(
    /無(?:資料|旅行|支出|分類|成員)|沒有(?:旅行|支出|分類|成員)|0\s*筆|(?:JPY|TWD)\s*0(?:\.0+)?(?:\s|$)|讀取失敗|發生錯誤/,
  );
  await expect(region.getByRole('alert')).toHaveCount(0);
  // Holding one ledger query must leave already-returned sibling sections visible.
  if (state.screen === '旅行帳本' && state.content !== '旅行資料') {
    await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
    if (state.content === '各幣別總額')
      await expect(page.getByText('晚餐', { exact: true })).toBeVisible();
    else
      await expect(page.getByRole('region', { name: '分幣別總額', exact: true })).toContainText(
        'JPY',
      );
  }
  expect(managementUI(world).writes.length).toBe(0);
  expect(await managementSnapshot(world)).toEqual(state.before);
  await assertOtherDataUnchanged(world);
}

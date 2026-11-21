import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  seedAnalysisRows,
  analysisContext,
} from '../../../../api/tests/support/category-analysis/fixture.js';
import type { AnalysisSeedRow } from '../../../../api/tests/support/category-analysis/contracts.js';
import { login } from '../browser.js';
import { analysisViewports, type AnalysisViewport } from './options.js';

export async function openAnalysisLedger(
  page: Page,
  world: LedgerWorld,
  viewport: AnalysisViewport = 'desktop',
) {
  await page.setViewportSize(analysisViewports[viewport]);
  await login(page, world, 'Alice');
  const c = analysisContext(world);
  const reads: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.endsWith('/expense-analysis')) reads.push(r.url());
  });
  world.set('analysis:requests', reads);
  const trip = (await world.db.query('SELECT name FROM trips WHERE id=$1', [c.tripId])).rows[0];
  await page.goto(`/trips/${c.tripId}`);
  await expect(page.getByRole('heading', { name: trip.name, exact: true })).toBeVisible();
  await expect(
    page
      .locator('.ledger-record-count')
      .or(page.getByRole('heading', { name: '旅程還有很多空白，真好。', exact: true })),
  ).toBeVisible();
  expect(reads).toEqual([]);
  world.set('analysis:viewport', viewport);
}

export async function arrangeAnalysisRows(
  page: Page,
  world: LedgerWorld,
  rows: AnalysisSeedRow[],
  viewport: AnalysisViewport = 'desktop',
) {
  await seedAnalysisRows(world, rows);
  await openAnalysisLedger(page, world, viewport);
}

export async function setAnalysisDevice(page: Page, world: LedgerWorld, device: string) {
  expect(['桌機', '手機']).toContain(device);
  const viewport = device === '手機' ? 'mobile' : 'desktop';
  const url = page.url();
  await page.setViewportSize(analysisViewports[viewport]);
  if (device === '手機') {
    // WebKit touch emulation can report maxTouchPoints=0. Verify native input
    // on an isolated page, leaving the product's DOM and navigation untouched.
    const probe = await page.context().newPage();
    try {
      await probe.setContent(
        '<meta name="viewport" content="width=device-width, initial-scale=1"><button style="width:120px;height:60px">Touch probe</button>',
      );
      await probe.evaluate(() => {
        const events: { type: string; trusted: boolean; touches: number }[] = [];
        Object.assign(window, { analysisTouchProbe: events });
        for (const type of ['touchstart', 'touchend'])
          document.querySelector('button')!.addEventListener(type, (event) => {
            const touch = event as TouchEvent;
            events.push({ type, trusted: event.isTrusted, touches: touch.touches.length });
          });
      });
      await probe.getByRole('button', { name: 'Touch probe' }).tap();
      expect(await probe.evaluate(() => Reflect.get(window, 'analysisTouchProbe'))).toEqual([
        { type: 'touchstart', trusted: true, touches: 1 },
        { type: 'touchend', trusted: true, touches: 0 },
      ]);
    } finally {
      await probe.close();
    }
  }
  world.set('analysis:viewport', viewport);
  expect(page.url()).toBe(url);
}

export async function loadAnalysisLedgerCount(page: Page, world: LedgerWorld, count: number) {
  expect([20, 25]).toContain(count);
  if (count === 25) await page.getByRole('button', { name: '載入更多', exact: true }).click();
  await expect(page.locator('.expense-row')).toHaveCount(count);
  expect(
    (
      await world.db.query('SELECT count(*)::int AS n FROM expenses WHERE trip_id=$1', [
        analysisContext(world).tripId,
      ])
    ).rows[0].n,
  ).toBe(25);
  world.set('analysis:loadedCount', count);
  expect(world.get('analysis:requests')).toEqual([]);
}

export async function arrangeLongAnalysisRows(
  page: Page,
  world: LedgerWorld,
  viewport: AnalysisViewport = 'desktop',
) {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    項目: `分類消費${i + 1}`,
    分類: i === 0 ? '長'.repeat(30) : `分類${i + 1}`,
    幣別: 'TWD',
    金額: String((i + 1) * 10),
    付款人: 'Alice',
    分攤者: 'Alice',
  }));
  await arrangeAnalysisRows(page, world, rows, viewport);
  expect(analysisContext(world).categories.size).toBe(12);
  const stored = (
    await world.db.query('SELECT name FROM categories WHERE owner_id=$1', [
      world.users.get('Alice')!.id,
    ])
  ).rows;
  expect(Math.max(...stored.map((r) => [...String(r.name)].length))).toBe(30);
  world.set('analysis:longRows', rows);
}

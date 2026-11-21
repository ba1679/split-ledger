import { test, expect } from '../../../../apps/web/tests/support/fixtures.js';
import { arrangeAnalysisRows } from '../../../../apps/web/tests/support/category-analysis/arrange.js';
import { analysisSnapshot } from '../../../../apps/api/tests/support/category-analysis/fixture.js';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';

// Software-test arrange only. After ready, all human-path UI input comes from native CUA.
test('isolated fixture for manual VoiceOver and browser touch-emulation verification', async ({ page, world }) => {
  await arrangeAnalysisRows(page, world, [
    { 項目: '晚餐', 分類: '餐飲', 幣別: 'TWD', 金額: '900', 付款人: 'Amy', 分攤者: 'Alice、Amy、Bob' },
    { 項目: '計程車', 分類: '交通', 幣別: 'TWD', 金額: '600', 付款人: 'Alice', 分攤者: 'Amy、Bob' },
    { 項目: '伴手禮', 分類: '購物', 幣別: 'TWD', 金額: '200', 付款人: 'Alice', 分攤者: 'Alice' },
    { 項目: '代買品', 分類: '購物', 幣別: 'TWD', 金額: '100', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: '咖啡', 分類: '餐飲', 幣別: 'TWD', 金額: '100', 付款人: 'Bob', 分攤者: 'Bob' },
    { 項目: '日圓餐費', 分類: '餐飲', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice' },
  ], 'desktop');
  const sourceHash = () => analysisSnapshot(world).then((source) => createHash('sha256').update(JSON.stringify(source)).digest('hex'));
  const before = await sourceHash();
  await page.evaluate(() => {
    const observed: { type: string; trusted: boolean; target: string; key?: string; value?: string; timestamp: number }[] = [];
    Object.assign(window, { analysisManualEvents: observed });
    for (const type of ['pointerdown', 'touchstart', 'touchend', 'keydown', 'focusin', 'change'])
      document.addEventListener(type, (event) => {
        const target = event.target instanceof Element ? event.target : null;
        observed.push({ type, trusted: event.isTrusted, target: target?.getAttribute('aria-label') ?? target?.textContent?.slice(0, 100) ?? '', key: event instanceof KeyboardEvent ? event.key : undefined, value: target instanceof HTMLSelectElement ? target.value : undefined, timestamp: Date.now() });
      }, true);
  });
  const commandFile = '.cache/007-implement/T132-manual-command.json';
  await writeFile('.cache/007-implement/T132-manual-ready.json', JSON.stringify({ url: page.url(), webOrigin: world.get('webOrigin'), sourceHash: before, mode: 'Native CUA input only after ready; device emulation, if used, is not physical-device proof.' }, null, 2)+'\n');
  let last = '';
  while (true) {
    let command: { id: string; action: 'snapshot' | 'finish'; phase: string } | undefined;
    try { command = JSON.parse(await readFile(commandFile, 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (!command || command.id === last) { await pause(250); continue; }
    last = command.id;
    expect(command.phase).toMatch(/^[a-z0-9-]+$/);
    const observations = await page.evaluate(() => ({ events: Reflect.get(window, 'analysisManualEvents'), viewport: { width: innerWidth, height: innerHeight, touchPoints: navigator.maxTouchPoints }, currency: document.querySelector<HTMLSelectElement>('#analysis-currency')?.value, informationOpen: !!document.querySelector('[role="dialog"][aria-label="分類資訊"]') }));
    await page.screenshot({ path: `specs/plans/007-category-expense-charts/checks/screens/T132-manual-${command.phase}.png`, scale: 'css' });
    await writeFile(`specs/plans/007-category-expense-charts/checks/T132-manual-${command.phase}.json`, JSON.stringify({ ...observations, url: page.url(), accessibilityTree: await page.locator('main').ariaSnapshot() }, null, 2)+'\n');
    if (command.action === 'finish') {
      expect(await sourceHash()).toBe(before);
      expect(observations.informationOpen).toBe(false);
      await writeFile('.cache/007-implement/T132-manual-finished.json', JSON.stringify({ sourceUnchanged: true, lastPhase: command.phase }, null, 2)+'\n');
      break;
    }
  }
});

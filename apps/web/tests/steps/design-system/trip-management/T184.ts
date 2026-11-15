import { Then, expect } from '../../../support/fixtures.js';
import { awaitAuthReadHeld, type AuthWait } from '../../../support/loading/auth-wait.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import {
  assertOtherDataUnchanged,
  ownerRead,
} from '../../../../../api/tests/support/trip-management/preservation.js';

Then('身分確認有圖形與輔助語意且不洩漏私人內容', async ({ page, world }) => {
  const state = world.get<AuthWait>('loading:auth'),
    ui = managementUI(world);
  await awaitAuthReadHeld(world);
  expect(state.arrived).toBeGreaterThanOrEqual(1);
  expect(state.finished).toBe(0);
  const spinner = page.getByRole('status', {
    name: /(?:確認|查詢).*(?:身分|身份)|(?:身分|身份).*(?:確認|查詢)/,
  });
  await expect(spinner).toBeVisible();
  await expect(spinner).toHaveText('');
  expect(
    await spinner.evaluate((element) => {
      const nodes = [element, ...element.querySelectorAll('*')];

      return nodes.some((node) => {
        const box = node.getBoundingClientRect(),
          style = getComputedStyle(node);

        return (
          box.width >= 8 &&
          box.height >= 8 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          (node instanceof SVGElement ||
            [
              style.borderTopWidth,
              style.borderRightWidth,
              style.borderBottomWidth,
              style.borderLeftWidth,
            ].some((width) => parseFloat(width) > 0))
        );
      });
    }),
    'A visible graphical spinner must exist, beyond an empty status container',
  ).toBe(true);
  await expect(spinner.locator('a,button,input,select,textarea,[tabindex="0"]')).toHaveCount(0);
  expect(await spinner.getAttribute('tabindex')).not.toBe('0');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(
    /載入中|讀取中|正在確認|已登出|請先登入|Google.*登入|日本旅行|台南旅行|私人旅行|晚餐|Alice/,
  );
  await expect(page.getByRole('region', { name: '成員淨額', exact: true })).toHaveCount(0);
  expect(ui.writes.length).toBe(0);
  expect(ui.reads.length).toBeGreaterThan(0);
  expect(ui.reads.every((read) => new URL(read.url()).pathname === '/api/me')).toBe(true);
  const me = await ownerRead(world, '/api/me');
  expect(me.status()).toBe(200);
  expect(await me.json()).toEqual(state.authority);
  const sessions = await world.db.query(
    'SELECT count(*)::int AS count FROM auth.session WHERE user_id=$1 AND expires_at>now()',
    [state.authority.id],
  );
  expect(sessions.rows[0]!.count).toBeGreaterThan(0);
  expect(await managementSnapshot(world)).toEqual(state.before);
  await assertOtherDataUnchanged(world);
});

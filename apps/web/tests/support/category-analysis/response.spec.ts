import { test, expect } from '../fixtures.js';
import { arrangeAnalysisRows } from './arrange.js';
import { controlNextAnalysis } from './response.js';

const rows = [
  { 項目: '餐點', 分類: '餐飲', 幣別: 'TWD', 金額: '200', 付款人: 'Alice', 分攤者: 'Alice、Amy' },
];
for (const mode of ['成功', '延遲成功', '失敗'])
  test(`T060 ${mode} controls one real upstream response`, async ({
    page,
    world,
    analysisViewport,
  }) => {
    await arrangeAnalysisRows(page, world, rows, analysisViewport);
    const control = controlNextAnalysis(world, mode);
    const pending = page.request.get(world.get<string>('webOrigin') + control.path);
    if (mode === '延遲成功') {
      await expect.poll(() => control.arrived).toBe(true);
      expect(control.finished).toBe(false);
      control.release();
    }
    const result = await pending.then(
      async (r) => ({ status: r.status(), body: await r.text(), error: undefined as unknown }),
      (error) => ({ status: undefined, body: undefined, error }),
    );
    if (mode === '失敗') {
      expect(control.arrived).toBe(true);
      expect(Boolean(result.error) || result.body === '{').toBe(true);
    } else {
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(200);
    }
  });

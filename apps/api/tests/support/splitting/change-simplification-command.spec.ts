import { test, expect } from '../fixtures.js';
import {
  changeSimplificationMode,
  changeSimplificationPhrase,
  simplificationModeInput,
} from './change-simplification-command.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { runIsolatedStep } from './harness.js';
import { seedSimplificationMode } from './simplification-mode-fixture.js';

test('T055 registers one mode string and maps only the two allowed modes', () => {
  expect(changeSimplificationPhrase).toBe('owner 將簡化付款切換為 {string}');
  expect(changeSimplificationPhrase.match(/\{string\}/g)).toHaveLength(1);
  expect(simplificationModeInput('開啟')).toBe(true);
  expect(simplificationModeInput('關閉')).toBe(false);
  expect(() => simplificationModeInput('未知')).toThrow('Unsupported simplification mode');
});

for (const mode of ['開啟', '關閉']) {
  test(`T055 isolated ${mode} persists one mode command and records its revision`, async ({
    world,
  }) => {
    await seedSplittingExpenses(world, [
      { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    await seedSimplificationMode(world, mode === '開啟' ? '關閉' : '開啟');
    await runIsolatedStep(
      { phrase: changeSimplificationPhrase, input: mode, execute: changeSimplificationMode },
      world,
    );
    expect(world.response!.status(), 'Product must accept the mode PATCH').toBe(200);
    expect(world.get('splitting:reply')).toMatchObject({
      simplifyDebts: mode === '開啟',
      accountingRevision: world.get('splitting:revision'),
    });
  });
}

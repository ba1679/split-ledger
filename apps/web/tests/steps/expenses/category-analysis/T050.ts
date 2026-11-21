import { Given } from '../../../support/fixtures.js';
import { setAnalysisViewer } from '../../../../../api/tests/support/category-analysis/access.js';
import { login } from '../../../support/browser.js';

Given('分類分析查看者為 {string}', async ({ page, world }, viewer) => {
  await setAnalysisViewer(world, viewer);
  if (viewer === '同名其他帳號') await login(page, world, 'Amy');
});

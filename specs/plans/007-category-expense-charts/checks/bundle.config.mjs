import base from '../../../../apps/web/vite.config.ts';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
export default {
  ...base,
  plugins: [...base.plugins, {
    name: 'analysis-bundle-evidence',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((item) => item.type === 'chunk').map((chunk) => ({
        fileName: chunk.fileName, bytes: Buffer.byteLength(chunk.code), imports: chunk.imports, dynamicImports: chunk.dynamicImports,
        modules: Object.entries(chunk.modules).map(([id, details]) => ({ id, renderedLength: details.renderedLength })),
      }));
      writeFileSync(resolve(process.cwd(), '../../specs/plans/007-category-expense-charts/checks/T131-bundle-graph.json'), JSON.stringify({ chunks }, null, 2)+'\n');
    },
  }],
};

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['packages/**/tests/**/*.test.ts', 'tests/smoke/**/*.test.ts'] },
});

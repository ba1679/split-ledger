import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config({ ignores: ['**/node_modules/**', '**/dist/**', '.cache/**', '**/.features-gen/**', 'playwright-report/**', 'test-results/**', 'specs/**'] }, js.configs.recommended, { files: ['scripts/**/*.mjs'], languageOptions: { globals: { URL: 'readonly', fetch: 'readonly', console: 'readonly' } } }, ...tseslint.configs.recommended, { files: ['**/*.ts', '**/*.tsx'], rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } });

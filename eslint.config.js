import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // schema.d.ts is generated from the backend's openapi.json (npm run api:types).
  { ignores: ['dist', 'node_modules', 'coverage', 'src/api/schema.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Route modules and test files export helpers alongside components by design.
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/app/router.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // CloudFront Function source: a plain script whose `handler` CloudFront calls (plan §1.4).
    files: ['infra/**/*.js'],
    languageOptions: { sourceType: 'script' },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^handler$' }],
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^handler$' }],
    },
  },
  {
    // Node config files in CommonJS, such as lighthouse.config.cjs.
    files: ['*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  prettier,
);

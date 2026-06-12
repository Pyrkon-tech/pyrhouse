import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import eslintPlugin from '@typescript-eslint/eslint-plugin'
import parser from '@typescript-eslint/parser'

export default [
  {
    ignores: ['dist'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser,
      parserOptions: {
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': eslintPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...eslintPlugin.configs.recommended.rules,
      // react-hooks v7: only the two classic rules. The recommended preset also
      // ships React Compiler readiness diagnostics (set-state-in-effect, refs,
      // purity, immutability, incompatible-library) — they flag patterns this
      // codebase uses on purpose (fetch-in-effect, ref-prop registries) and only
      // matter once we adopt the React Compiler. Revisit then.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Empty catch = intentional "ignore this error" (non-critical fetches, parsers)
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      // `_` prefix = intentionally unused (e.g. destructuring that skips fields)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // TypeScript itself catches undefined identifiers (including DOM types and the
    // global `google.maps`) — no-undef on TS files only produces false positives
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    // Vitest with `globals: true` — describe/it/expect/vi available without imports
    files: ['**/__tests__/**', '**/*.{test,spec}.{ts,tsx}', 'src/setupTests.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    // Config files executed in Node
    files: ['*.config.{js,ts}', 'vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Context modules intentionally export a provider component alongside its hook;
    // definition modules (navigation, transferStatus) export lazy-icon maps and
    // JSX helpers next to constants. Losing fast-refresh granularity there is fine.
    files: [
      'src/context/**',
      'src/theme/ThemeContext.tsx',
      'src/components/layout/navigation.tsx',
      'src/components/features/Transfer/components/details/transferStatus.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]

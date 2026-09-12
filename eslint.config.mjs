import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// 测试文件里的 describe / it / expect 由 Vitest 以全局形式注入，这里显式声明以免误报。
const vitestGlobals = {
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  vi: 'readonly',
}

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '.scratch/**',
      '.pgdata/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 规则冲突交给 Prettier 统一处理（必须放在最后覆盖格式类规则）
  prettierConfig,

  {
    files: ['apps/api/**/*.ts', 'packages/shared/**/*.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  {
    files: ['**/*.test.{ts,tsx}', '**/test/**/*.ts', '**/capture/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...vitestGlobals } },
  },

  {
    // 登录态上下文把 Provider 与其配套 hook 放在同一文件是有意为之：拆开需要改动十余个
    // 引用点，而该规则只影响开发期热更新体验，代价与收益不成比例。
    files: ['apps/web/src/auth/AuthContext.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
)

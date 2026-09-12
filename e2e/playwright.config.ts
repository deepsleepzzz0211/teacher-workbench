import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, devices } from '@playwright/test'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'zh-CN',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @tw/api start',
      cwd: repoRoot,
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @tw/web preview',
      cwd: repoRoot,
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})

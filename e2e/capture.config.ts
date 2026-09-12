import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, devices } from '@playwright/test'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  testDir: './capture',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'zh-CN',
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1000 } } }],
  webServer: [
    {
      command: 'pnpm --filter @tw/api start',
      cwd: repoRoot,
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @tw/web dev',
      cwd: repoRoot,
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
})

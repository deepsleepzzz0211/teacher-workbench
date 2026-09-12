import { defineConfig } from 'vitest/config'

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://tw_app:tw_app_pwd_2026@127.0.0.1:5432/teacher_workbench_test'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // 所有集成测试共用一个测试库，串行执行避免互相清库
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_DATABASE_URL,
      JWT_SECRET: 'integration-test-secret',
      CORS_ORIGIN: 'http://localhost:5173',
      LOGIN_RATE_LIMIT_MAX: '1000',
    },
  },
})

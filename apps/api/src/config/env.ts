import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'

const here = dirname(fileURLToPath(import.meta.url))

/** 依次向上寻找 .env：apps/api → 仓库根目录 */
export function loadEnv(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(here, '../../../.env'),
    resolve(here, '../../../../.env'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      dotenv.config({ path: candidate })
      return
    }
  }
}

loadEnv()

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(
      `缺少必需的环境变量 ${name}。请复制仓库根目录的 .env.example 为 .env 后再启动。`,
    )
  }
  return value
}

const isTest = process.env.NODE_ENV === 'test'

const DEFAULT_DEV_DB = 'postgres://tw_app:tw_app_pwd_2026@127.0.0.1:5432/teacher_workbench'
const DEFAULT_TEST_DB = 'postgres://tw_app:tw_app_pwd_2026@127.0.0.1:5432/teacher_workbench_test'

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isTest,
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '127.0.0.1',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: required('JWT_SECRET', 'teacher-workbench-dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  /** 测试环境自动切到测试库，避免污染开发数据 */
  databaseUrl: isTest
    ? (process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? DEFAULT_TEST_DB)
    : (process.env.DATABASE_URL ?? DEFAULT_DEV_DB),
  seedDefaultPassword: process.env.SEED_DEFAULT_PASSWORD ?? 'Teach@2026',
} as const

export type Env = typeof env

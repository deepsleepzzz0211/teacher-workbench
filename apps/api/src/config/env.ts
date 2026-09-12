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

export const DEV_JWT_SECRET_DEFAULT = 'teacher-workbench-dev-secret-change-me'

export function resolveJwtSecret(configured: string | undefined, isProduction: boolean): string {
  const value = configured?.trim()
  if (isProduction) {
    if (!value || value === DEV_JWT_SECRET_DEFAULT) {
      throw new Error(
        '生产环境必须配置独立的 JWT_SECRET：当前未配置，或仍在使用示例中的默认值。请设置一个随机且保密的密钥后重启。',
      )
    }
    return value
  }
  return value || DEV_JWT_SECRET_DEFAULT
}

const isTest = process.env.NODE_ENV === 'test'

export function resolveLoginRateLimit(): { max: number; timeWindow: string } {
  return {
    max: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 10),
    timeWindow: process.env.LOGIN_RATE_LIMIT_WINDOW ?? '1 minute',
  }
}

const DEFAULT_DEV_DB = 'postgres://tw_app:tw_app_pwd_2026@127.0.0.1:5432/teacher_workbench'
const DEFAULT_TEST_DB = 'postgres://tw_app:tw_app_pwd_2026@127.0.0.1:5432/teacher_workbench_test'

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isTest,
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '127.0.0.1',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: resolveJwtSecret(process.env.JWT_SECRET, process.env.NODE_ENV === 'production'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  /** 测试环境自动切到测试库，避免污染开发数据 */
  databaseUrl: isTest
    ? (process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? DEFAULT_TEST_DB)
    : (process.env.DATABASE_URL ?? DEFAULT_DEV_DB),
  seedDefaultPassword: process.env.SEED_DEFAULT_PASSWORD ?? 'Teach@2026',
} as const

export type Env = typeof env

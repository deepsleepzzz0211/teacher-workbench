import type { FastifyInstance } from 'fastify'

import { buildApp } from '../../src/app'
import { pool } from '../../src/db/client'
import { migrate, resetSchema } from '../../src/db/migrate'
import { seedDemoData } from '../../src/db/seed'

export const DEMO_PASSWORD = 'Teach@2026'

/** 安全阀：绝不允许测试跑到开发库上 */
export async function assertTestDatabase(): Promise<void> {
  const { rows } = await pool.query<{ name: string }>('select current_database() as name')
  const name = rows[0]?.name ?? ''
  if (!name.endsWith('_test')) {
    throw new Error(`拒绝在非测试库上执行集成测试，当前库为：${name}`)
  }
}

export async function setupDatabase(): Promise<void> {
  await assertTestDatabase()
  await resetSchema(pool)
  await migrate(pool)
  await seedDemoData()
}

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.ready()
  return app
}

export async function closeTestApp(app: FastifyInstance): Promise<void> {
  await app.close()
  await pool.end()
}

export async function login(app: FastifyInstance, username: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password: DEMO_PASSWORD },
  })
  if (response.statusCode !== 200) {
    throw new Error(`登录失败（${username}）：${response.statusCode} ${response.body}`)
  }
  return response.json<{ token: string }>().token
}

export function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}

export interface Session {
  app: FastifyInstance
  teacherToken: string
  otherTeacherToken: string
  adminToken: string
}

/** 每个测试文件的标准前置：建库 → 灌种子 → 起应用 → 拿到三种身份的令牌 */
export async function createSession(): Promise<Session> {
  await setupDatabase()
  const app = await createTestApp()
  const [teacherToken, otherTeacherToken, adminToken] = await Promise.all([
    login(app, 't1001'),
    login(app, 't1002'),
    login(app, 'admin'),
  ])
  return { app, teacherToken, otherTeacherToken, adminToken }
}

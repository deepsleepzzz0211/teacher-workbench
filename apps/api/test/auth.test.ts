import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { authHeaders, closeTestApp, createSession, DEMO_PASSWORD, type Session } from './helpers/setup'

describe('认证模块', () => {
  let app: FastifyInstance
  let session: Session

  beforeAll(async () => {
    session = await createSession()
    app = session.app
  })

  afterAll(async () => {
    await closeTestApp(app)
  })

  it('正确用户名密码登录成功，返回令牌与教师档案', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 't1001', password: DEMO_PASSWORD },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ token: string; user: Record<string, unknown> }>()
    expect(body.token).toBeTruthy()
    expect(body.user.name).toBe('陈立群')
    expect(body.user.department).toBe('智能制造学院')
    expect(body.user.role).toBe('teacher')
    expect(body.user).not.toHaveProperty('passwordHash')
    expect(body.user).not.toHaveProperty('password_hash')
  })

  it('密码错误返回 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 't1001', password: 'wrong-password' },
    })
    expect(response.statusCode).toBe(401)
    expect(response.json<{ message: string }>().message).toContain('用户名或密码')
  })

  it('用户不存在返回 401 而非 404，避免暴露账号是否存在', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'nobody', password: DEMO_PASSWORD },
    })
    expect(response.statusCode).toBe(401)
  })

  it('缺少密码返回 400 并提示字段', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 't1001' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json<{ message: string }>().message).toContain('password')
  })

  it('携带有效令牌可获取当前用户', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: authHeaders(session.teacherToken),
    })
    expect(response.statusCode).toBe(200)
    expect(response.json<{ username: string }>().username).toBe('t1001')
  })

  it('不带令牌访问受保护接口返回 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(response.statusCode).toBe(401)
  })

  it('伪造令牌返回 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: authHeaders('not-a-real-token'),
    })
    expect(response.statusCode).toBe(401)
  })

  it('健康检查无需鉴权', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json<{ status: string }>().status).toBe('ok')
  })

  it('未知路由返回 404 且带中文提示', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/not-exists',
      headers: authHeaders(session.teacherToken),
    })
    expect(response.statusCode).toBe(404)
    expect(response.json<{ code: string }>().code).toBe('ROUTE_NOT_FOUND')
  })
})

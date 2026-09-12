import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { closeTestApp, createSession, DEMO_PASSWORD, type Session } from './helpers/setup'

describe('登录限流', () => {
  let app: FastifyInstance
  let session: Session

  beforeAll(async () => {
    process.env.LOGIN_RATE_LIMIT_MAX = '8'
    session = await createSession()
    app = session.app
  })

  afterAll(async () => {
    await closeTestApp(app)
    delete process.env.LOGIN_RATE_LIMIT_MAX
  })

  it('阈值内的正常登录不受影响', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 't1001', password: DEMO_PASSWORD },
    })
    expect(response.statusCode).toBe(200)
  })

  it('账号不存在与密码错误返回相同状态码，不泄漏账号是否存在', async () => {
    const existing = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 't1001', password: 'wrong-password' },
    })
    const missing = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'nobody-here', password: 'wrong-password' },
    })

    expect(existing.statusCode).toBe(401)
    expect(missing.statusCode).toBe(existing.statusCode)
  })

  it('连续尝试达到阈值后返回 429', async () => {
    let throttled = false

    for (let attempt = 0; attempt < 15; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 't1001', password: 'wrong-password' },
      })

      if (response.statusCode === 429) {
        throttled = true
        expect(response.json<{ message: string }>().message).toBeTruthy()
        break
      }
      expect(response.statusCode).toBe(401)
    }

    expect(throttled, '连续尝试应触发限流并返回 429').toBe(true)
  })

  it('限流只作用于登录接口，不影响其它已鉴权接口', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${session.teacherToken}` },
    })
    expect(response.statusCode).toBe(200)
  })
})

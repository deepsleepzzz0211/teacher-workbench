import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import type { EnterprisePractice, PracticeProgress } from '@tw/shared'

import { authHeaders, closeTestApp, createSession, type Session } from './helpers/setup'

describe('企业实践（双师型）模块', () => {
  let app: FastifyInstance
  let session: Session
  let headers: Record<string, string>

  beforeAll(async () => {
    session = await createSession()
    app = session.app
    headers = authHeaders(session.teacherToken)
  })

  afterAll(async () => {
    await closeTestApp(app)
  })

  async function progress(token = session.teacherToken): Promise<PracticeProgress> {
    const response = await app.inject({
      method: 'GET',
      url: '/api/practices',
      headers: authHeaders(token),
    })
    expect(response.statusCode).toBe(200)
    return response.json<PracticeProgress>()
  }

  it('汇总近 5 年累计实践天数与政策要求', async () => {
    const result = await progress()
    expect(result.accumulatedDays).toBe(127)
    expect(result.requiredDays).toBe(180)
    expect(result.remainingDays).toBe(53)
    expect(result.rate).toBe(0.706)
    expect(result.records).toHaveLength(3)
  })

  it('记录按开始日期倒序返回', async () => {
    const result = await progress()
    const dates = result.records.map((record) => record.startDate)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('未填天数时按起止日期（含首尾）自动计算', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/practices',
      headers,
      payload: {
        company: '测试企业有限公司',
        position: '测试岗位',
        startDate: '2026-09-01',
        endDate: '2026-09-10',
      },
    })

    expect(response.statusCode).toBe(201)
    const practice = response.json<EnterprisePractice>()
    expect(practice.days).toBe(10)

    await app.inject({ method: 'DELETE', url: `/api/practices/${practice.id}`, headers })
  })

  it('显式填写天数时以其为准', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/practices',
      headers,
      payload: {
        company: '测试企业有限公司',
        position: '测试岗位',
        startDate: '2026-09-01',
        endDate: '2026-09-10',
        days: 4,
      },
    })
    const practice = response.json<EnterprisePractice>()
    expect(practice.days).toBe(4)
    await app.inject({ method: 'DELETE', url: `/api/practices/${practice.id}`, headers })
  })

  it('结束日期早于开始日期返回 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/practices',
      headers,
      payload: {
        company: '测试企业有限公司',
        position: '测试岗位',
        startDate: '2026-09-10',
        endDate: '2026-09-01',
      },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json<{ message: string }>().message).toContain('结束日期')
  })

  it('新增记录后进度同步增长，删除后回落', async () => {
    const before = await progress()

    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/practices',
        headers,
        payload: {
          company: '新增实践企业有限公司',
          position: '技术支持',
          startDate: '2026-09-01',
          endDate: '2026-09-20',
        },
      })
    ).json<EnterprisePractice>()

    const after = await progress()
    expect(after.accumulatedDays).toBe(before.accumulatedDays + 20)
    expect(after.remainingDays).toBe(before.remainingDays - 20)

    await app.inject({ method: 'DELETE', url: `/api/practices/${created.id}`, headers })
    expect((await progress()).accumulatedDays).toBe(before.accumulatedDays)
  })

  it('不能删除他人的实践记录', async () => {
    const mine = (await progress()).records[0]!
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/practices/${mine.id}`,
      headers: authHeaders(session.otherTeacherToken),
    })
    expect(response.statusCode).toBe(404)
  })

  it('他人的实践进度独立统计', async () => {
    const other = await progress(session.otherTeacherToken)
    expect(other.accumulatedDays).toBe(51)
    expect(other.records).toHaveLength(1)
  })

  it('未登录访问返回 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/practices' })
    expect(response.statusCode).toBe(401)
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import type { ScheduleEntry, Term } from '@tw/shared'

import { authHeaders, closeTestApp, createSession, type Session } from './helpers/setup'

interface ScheduleResult {
  term: Term
  week: number
  entries: ScheduleEntry[]
}

describe('课表模块', () => {
  let app: FastifyInstance
  let session: Session

  beforeAll(async () => {
    session = await createSession()
    app = session.app
  })

  afterAll(async () => {
    await closeTestApp(app)
  })

  async function fetchSchedule(query: string, token = session.teacherToken): Promise<ScheduleResult> {
    const response = await app.inject({
      method: 'GET',
      url: `/api/schedule${query}`,
      headers: authHeaders(token),
    })
    expect(response.statusCode).toBe(200)
    return response.json<ScheduleResult>()
  }

  it('不传周次时回退到当前教学周', async () => {
    const result = await fetchSchedule('')
    expect(result.week).toBeGreaterThanOrEqual(1)
    expect(result.week).toBeLessThanOrEqual(20)
    expect(result.term.isCurrent).toBe(true)
  })

  it('第 2 周返回 5 门课（单周课程被排除）', async () => {
    const result = await fetchSchedule('?week=2')
    expect(result.week).toBe(2)
    expect(result.entries).toHaveLength(5)
    expect(result.entries.some((entry) => entry.courseName === 'PLC控制系统安装与调试')).toBe(false)
  })

  it('第 3 周返回 6 门课（单周课程纳入）', async () => {
    const result = await fetchSchedule('?week=3')
    expect(result.entries).toHaveLength(6)
    expect(result.entries.some((entry) => entry.courseName === 'PLC控制系统安装与调试')).toBe(true)
  })

  it('每条课表项都落在所查询的周次范围内，且单双周匹配', async () => {
    const result = await fetchSchedule('?week=5')
    for (const entry of result.entries) {
      expect(entry.weekStart).toBeLessThanOrEqual(5)
      expect(entry.weekEnd).toBeGreaterThanOrEqual(5)
      if (entry.weekParity === 'odd') expect(5 % 2).toBe(1)
      if (entry.weekParity === 'even') expect(5 % 2).toBe(0)
    }
  })

  it('课表项包含上课地点与班级，可直接用于展示', async () => {
    const result = await fetchSchedule('?week=2')
    const drafting = result.entries.find((entry) => entry.courseName === '机械制图与CAD')!
    expect(drafting.location).toContain('A101')
    expect(drafting.className).toBe('机电一体化技术2301')
    expect(drafting.weekday).toBe(1)
    expect(drafting.startSection).toBe(1)
    expect(drafting.endSection).toBe(2)
  })

  it('指定学期可按学期查询', async () => {
    const terms = (
      await app.inject({
        method: 'GET',
        url: '/api/catalog/terms',
        headers: authHeaders(session.teacherToken),
      })
    ).json<Term[]>()

    const previous = terms.find((term) => term.name === '2025-2026学年第二学期')!
    const result = await fetchSchedule(`?termId=${previous.id}&week=3`)
    expect(result.term.id).toBe(previous.id)
    expect(result.entries).toHaveLength(0)
  })

  it('不同教师的课表互相隔离', async () => {
    const mine = await fetchSchedule('?week=2')
    const others = await fetchSchedule('?week=2', session.otherTeacherToken)
    const myNames = new Set(mine.entries.map((entry) => entry.courseName))
    expect(others.entries.every((entry) => !myNames.has(entry.courseName) || entry.courseName !== '数控加工工艺与编程')).toBe(true)
    expect(others.entries).toHaveLength(1)
  })

  it('未登录访问课表返回 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/schedule' })
    expect(response.statusCode).toBe(401)
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import type { DashboardOverview } from '@tw/shared'

import { authHeaders, closeTestApp, createSession, type Session } from './helpers/setup'

describe('工作台首页聚合', () => {
  let app: FastifyInstance
  let session: Session

  beforeAll(async () => {
    session = await createSession()
    app = session.app
  })

  afterAll(async () => {
    await closeTestApp(app)
  })

  async function dashboard(token = session.teacherToken): Promise<DashboardOverview> {
    const response = await app.inject({
      method: 'GET',
      url: '/api/dashboard',
      headers: authHeaders(token),
    })
    expect(response.statusCode).toBe(200)
    return response.json<DashboardOverview>()
  }

  it('返回教师档案与当前学期', async () => {
    const result = await dashboard()
    expect(result.teacher.name).toBe('陈立群')
    expect(result.teacher.department).toBe('智能制造学院')
    expect(result.currentTerm).not.toBeNull()
    expect(result.currentTerm!.week).toBeGreaterThanOrEqual(1)
    expect(result.currentTerm!.week).toBeLessThanOrEqual(20)
  })

  it('日期字段为 YYYY-MM-DD 且星期在 1-7 之间', async () => {
    const result = await dashboard()
    expect(result.today.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.today.weekday).toBeGreaterThanOrEqual(1)
    expect(result.today.weekday).toBeLessThanOrEqual(7)
  })

  it('今日无课时自动回退到下一个有课的教学日，并标明该日期', async () => {
    const { courses, showingFrom, hours } = (await dashboard()).today

    if (courses.length > 0 && showingFrom !== null) {
      expect(showingFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const weekday = new Date(`${showingFrom}T00:00:00`).getDay()
      expect(weekday).toBeGreaterThanOrEqual(1)
      expect(weekday).toBeLessThanOrEqual(5)
      expect(hours).toBeGreaterThan(0)
    } else if (courses.length > 0) {
      expect(hours).toBeGreaterThan(0)
    } else {
      expect(hours).toBe(0)
      expect(showingFrom).toBeNull()
    }
  })

  it('今日课程字段完整，可直接渲染', async () => {
    const result = await dashboard()
    for (const course of result.today.courses) {
      expect(course.courseName).toBeTruthy()
      expect(course.className).toBeTruthy()
      expect(course.startSection).toBeLessThanOrEqual(course.endSection)
    }
  })

  it('携带本学期工作量汇总', async () => {
    const result = await dashboard()
    expect(result.workload).not.toBeNull()
    expect(result.workload!.totalHours).toBe(468.2)
    expect(result.workload!.requiredHours).toBe(240)
    expect(result.workload!.achievementRate).toBe(1.951)
    expect(result.workload!.taskCount).toBe(6)
    expect(result.workload!.itemCount).toBe(4)
  })

  it('携带教科研成果统计与最近成果', async () => {
    const result = await dashboard()
    expect(result.achievement.total).toBe(8)
    expect(result.achievement.scoreSum).toBe(114)
    expect(result.achievement.recent).toHaveLength(5)
    expect(result.achievement.byCategory.paper).toBe(2)
    expect(result.achievement.byCategory.competition).toBe(2)
  })

  it('携带企业实践进度', async () => {
    const result = await dashboard()
    expect(result.practice.accumulatedDays).toBe(127)
    expect(result.practice.remainingDays).toBe(53)
  })

  it('携带待办与通知，数量受上限约束', async () => {
    const result = await dashboard()
    expect(result.todos.length).toBeGreaterThan(0)
    expect(result.todos.length).toBeLessThanOrEqual(8)
    expect(result.todos.every((todo) => todo.status === 'pending')).toBe(true)
    expect(result.notices).toHaveLength(5)
  })

  it('计数器与明细一致', async () => {
    const result = await dashboard()
    expect(result.counters.pendingTodos).toBe(5)
    expect(result.counters.unreadNotices).toBe(4)
    expect(result.counters.pendingApplications).toBe(1)
  })

  it('携带本周课表', async () => {
    const result = await dashboard()
    expect(Array.isArray(result.weekSchedule)).toBe(true)
    for (const entry of result.weekSchedule) {
      expect(entry.weekday).toBeGreaterThanOrEqual(1)
      expect(entry.weekday).toBeLessThanOrEqual(7)
    }
  })

  it('管理员视角的待审批数量覆盖全院系', async () => {
    const result = await dashboard(session.adminToken)
    expect(result.teacher.role).toBe('dept_admin')
    expect(result.counters.pendingApplications).toBe(2)
  })

  it('未登录访问返回 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/dashboard' })
    expect(response.statusCode).toBe(401)
  })
})

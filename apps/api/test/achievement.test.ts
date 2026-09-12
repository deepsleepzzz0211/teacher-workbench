import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import type { Achievement, AchievementStats, Paginated } from '@tw/shared'

import { authHeaders, closeTestApp, createSession, type Session } from './helpers/setup'

describe('教科研成果模块', () => {
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

  async function list(query = '', token = session.teacherToken): Promise<Paginated<Achievement>> {
    const response = await app.inject({
      method: 'GET',
      url: `/api/achievements${query}`,
      headers: authHeaders(token),
    })
    expect(response.statusCode).toBe(200)
    return response.json<Paginated<Achievement>>()
  }

  it('默认返回本人全部 8 条成果', async () => {
    const result = await list()
    expect(result.total).toBe(8)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
  })

  it('按类别筛选', async () => {
    const result = await list('?category=paper')
    expect(result.total).toBe(2)
    expect(result.items.every((item) => item.category === 'paper')).toBe(true)
  })

  it('按级别筛选', async () => {
    const result = await list('?level=national')
    expect(result.total).toBe(2)
  })

  it('按时间区间筛选', async () => {
    const result = await list('?from=2026-01-01&to=2026-12-31')
    expect(result.total).toBe(5)
  })

  it('分页生效', async () => {
    const result = await list('?page=2&pageSize=3')
    expect(result.items).toHaveLength(3)
    expect(result.total).toBe(8)
  })

  it('统计给出类别、级别构成与总分', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/achievements/stats', headers })
    expect(response.statusCode).toBe(200)
    const stats = response.json<AchievementStats>()

    expect(stats.total).toBe(8)
    expect(stats.scoreSum).toBe(114)
    expect(stats.byCategory.paper).toBe(2)
    expect(stats.byCategory.competition).toBe(2)
    expect(stats.byCategory.patent).toBe(1)
    expect(stats.byLevel.national).toBe(2)
    expect(stats.byLevel.provincial).toBe(3)
    expect(stats.byLevel.school).toBe(3)
  })

  it('未填分值的新增成果按级别自动折算（省级 15 分）', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/achievements',
      headers,
      payload: {
        category: 'project',
        title: '高职智能制造专业群建设路径研究',
        level: 'provincial',
        role: '主持人',
        achievedOn: '2026-09-01',
      },
    })

    expect(response.statusCode).toBe(201)
    const achievement = response.json<Achievement>()
    expect(achievement.score).toBe(15)
    expect(achievement.category).toBe('project')
  })

  it('显式填写分值时以填写值为准', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/achievements',
        headers,
        payload: {
          category: 'training',
          title: '数字化教学能力专项培训',
          level: 'school',
          role: '参训学员',
          achievedOn: '2026-09-02',
          score: 7.5,
        },
      })
    ).json<Achievement>()

    expect(created.score).toBe(7.5)
    await app.inject({ method: 'DELETE', url: `/api/achievements/${created.id}`, headers })
  })

  it('只修改其它字段时，手填分值保持不变（回归）', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/achievements',
        headers,
        payload: {
          category: 'paper',
          title: '手填分值保护回归用例',
          level: 'school',
          role: '独著',
          achievedOn: '2026-09-05',
          score: 42,
        },
      })
    ).json<Achievement>()
    expect(created.score).toBe(42)

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/achievements/${created.id}`,
      headers,
      payload: { title: '手填分值保护回归用例（已更正标题）', description: '仅补充说明' },
    })

    expect(patched.statusCode).toBe(200)
    expect(patched.json<Achievement>().score).toBe(42)

    await app.inject({ method: 'DELETE', url: `/api/achievements/${created.id}`, headers })
  })

  it('改动级别且未手填分值时，分值按新级别自动折算', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/achievements',
        headers,
        payload: {
          category: 'textbook',
          title: '级别变更折算回归用例',
          level: 'school',
          role: '主编',
          achievedOn: '2026-09-06',
        },
      })
    ).json<Achievement>()
    expect(created.score).toBe(3)

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/achievements/${created.id}`,
      headers,
      payload: { level: 'provincial' },
    })

    expect(patched.statusCode).toBe(200)
    expect(patched.json<Achievement>().score).toBe(15)

    await app.inject({ method: 'DELETE', url: `/api/achievements/${created.id}`, headers })
  })

  it('改动级别但同时手填分值时，以手填值为准', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/achievements',
        headers,
        payload: {
          category: 'textbook',
          title: '手填优先回归用例',
          level: 'school',
          role: '主编',
          achievedOn: '2026-09-07',
          score: 6,
        },
      })
    ).json<Achievement>()

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/achievements/${created.id}`,
      headers,
      payload: { level: 'provincial', score: 88 },
    })

    expect(patched.statusCode).toBe(200)
    expect(patched.json<Achievement>().score).toBe(88)

    await app.inject({ method: 'DELETE', url: `/api/achievements/${created.id}`, headers })
  })

  it('非法类别返回 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/achievements',
      headers,
      payload: { category: 'blog', title: '标题够长了', level: 'school', role: '独著', achievedOn: '2026-09-01' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json<{ message: string }>().message).toContain('category')
  })

  it('标题过短返回 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/achievements',
      headers,
      payload: { category: 'paper', title: '短', level: 'school', role: '独著', achievedOn: '2026-09-01' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('可修改成果信息', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/achievements',
        headers,
        payload: {
          category: 'textbook',
          title: '《传感器与检测技术实训指导》',
          level: 'school',
          role: '主编',
          achievedOn: '2026-09-03',
        },
      })
    ).json<Achievement>()

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/achievements/${created.id}`,
      headers,
      payload: { level: 'provincial', title: '《传感器与检测技术实训指导（第二版）》' },
    })

    expect(updated.statusCode).toBe(200)
    const body = updated.json<Achievement>()
    expect(body.level).toBe('provincial')
    expect(body.score).toBe(15)

    await app.inject({ method: 'DELETE', url: `/api/achievements/${created.id}`, headers })
  })

  it('可删除成果，删除后总数回落', async () => {
    const before = (await list()).total
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/achievements',
        headers,
        payload: {
          category: 'paper',
          title: '待删除的测试成果记录',
          level: 'school',
          role: '独著',
          achievedOn: '2026-09-04',
        },
      })
    ).json<Achievement>()

    expect((await list()).total).toBe(before + 1)
    const deleted = await app.inject({ method: 'DELETE', url: `/api/achievements/${created.id}`, headers })
    expect(deleted.statusCode).toBe(200)
    expect((await list()).total).toBe(before)
  })

  it('不能修改或删除他人的成果', async () => {
    const mine = (await list()).items[0]!
    const otherHeaders = authHeaders(session.otherTeacherToken)

    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/achievements/${mine.id}`,
      headers: otherHeaders,
      payload: { title: '被别人改掉的标题' },
    })
    expect(patch.statusCode).toBe(404)

    const remove = await app.inject({
      method: 'DELETE',
      url: `/api/achievements/${mine.id}`,
      headers: otherHeaders,
    })
    expect(remove.statusCode).toBe(404)
  })

  it('他人只能看到自己的成果', async () => {
    const result = await list('', session.otherTeacherToken)
    expect(result.total).toBe(1)
    expect(result.items[0]!.title).toContain('岗课赛证')
  })
})

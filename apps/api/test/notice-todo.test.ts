import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import type { Notice, NoticeListResult, Todo } from '@tw/shared'

import { authHeaders, closeTestApp, createSession, type Session } from './helpers/setup'

describe('通知公告与待办模块', () => {
  let app: FastifyInstance
  let session: Session
  let teacherHeaders: Record<string, string>
  let adminHeaders: Record<string, string>

  beforeAll(async () => {
    session = await createSession()
    app = session.app
    teacherHeaders = authHeaders(session.teacherToken)
    adminHeaders = authHeaders(session.adminToken)
  })

  afterAll(async () => {
    await closeTestApp(app)
  })

  describe('通知公告', () => {
    async function listNotices(query = '', headers = teacherHeaders): Promise<NoticeListResult> {
      const response = await app.inject({ method: 'GET', url: `/api/notices${query}`, headers })
      expect(response.statusCode).toBe(200)
      return response.json<NoticeListResult>()
    }

    it('返回 6 条通知，其中 4 条未读', async () => {
      const result = await listNotices()
      expect(result.total).toBe(6)
      expect(result.unreadCount).toBe(4)
      expect(result.items).toHaveLength(6)
    })

    it('置顶通知排在最前', async () => {
      const result = await listNotices()
      expect(result.items[0]!.isTop).toBe(true)
      expect(result.items[0]!.title).toContain('双师型')
    })

    it('非置顶通知按发布时间倒序', async () => {
      const rest = (await listNotices()).items.filter((item) => !item.isTop)
      const times = rest.map((item) => item.publishedAt)
      expect([...times].sort().reverse()).toEqual(times)
    })

    it('已读状态随用户变化', async () => {
      const mine = await listNotices()
      expect(mine.items.filter((item) => item.isRead)).toHaveLength(2)

      const others = await listNotices('', adminHeaders)
      expect(others.items.filter((item) => item.isRead)).toHaveLength(0)
    })

    it('标记已读后未读数减少且幂等', async () => {
      const unread = (await listNotices()).items.find((item) => !item.isRead)!

      const first = await app.inject({
        method: 'POST',
        url: `/api/notices/${unread.id}/read`,
        headers: teacherHeaders,
      })
      expect(first.statusCode).toBe(200)
      const afterFirst = await listNotices()
      expect(afterFirst.unreadCount).toBe(3)

      await app.inject({ method: 'POST', url: `/api/notices/${unread.id}/read`, headers: teacherHeaders })
      expect((await listNotices()).unreadCount).toBe(3)
    })

    it('可查看通知详情', async () => {
      const target = (await listNotices()).items[0]!
      const response = await app.inject({
        method: 'GET',
        url: `/api/notices/${target.id}`,
        headers: teacherHeaders,
      })
      expect(response.statusCode).toBe(200)
      expect(response.json<Notice>().content).toContain('各二级学院')
    })

    it('查看不存在的通知返回 404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/notices/11111111-1111-4111-8111-111111111111',
        headers: teacherHeaders,
      })
      expect(response.statusCode).toBe(404)
    })

    it('普通教师发布通知被拒绝（403）', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/notices',
        headers: teacherHeaders,
        payload: { title: '教师越权发布的通知', content: '不应成功', category: 'general' },
      })
      expect(response.statusCode).toBe(403)
    })

    it('管理员可发布通知并出现在列表中', async () => {
      const before = (await listNotices()).total

      const response = await app.inject({
        method: 'POST',
        url: '/api/notices',
        headers: adminHeaders,
        payload: {
          title: '关于本学期期终教学检查安排的通知',
          content: '请各位老师于第 16 周前完成教学资料归档，配合期终教学检查。',
          category: 'academic',
          isTop: false,
        },
      })

      expect(response.statusCode).toBe(201)
      const created = response.json<Notice>()
      expect(created.publisherName).toBe('刘建国')
      expect((await listNotices()).total).toBe(before + 1)
    })

    it('未登录访问通知返回 401', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/notices' })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('待办事项', () => {
    async function listTodos(query = '', headers = teacherHeaders): Promise<Todo[]> {
      const response = await app.inject({ method: 'GET', url: `/api/todos${query}`, headers })
      expect(response.statusCode).toBe(200)
      return response.json<Todo[]>()
    }

    it('返回本人 6 条待办，未完成排在前', async () => {
      const todos = await listTodos()
      expect(todos).toHaveLength(6)
      expect(todos[0]!.status).toBe('pending')
      expect(todos[todos.length - 1]!.status).toBe('done')
    })

    it('未完成待办按截止日期升序', async () => {
      const pending = await listTodos('?status=pending')
      expect(pending).toHaveLength(5)
      const dates = pending.map((todo) => todo.dueDate)
      expect([...dates].sort()).toEqual(dates)
    })

    it('可新增待办，默认优先级为中', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/todos',
        headers: teacherHeaders,
        payload: { title: '整理本学期教研活动记录', dueDate: '2026-10-10' },
      })

      expect(response.statusCode).toBe(201)
      const todo = response.json<Todo>()
      expect(todo.priority).toBe('medium')
      expect(todo.status).toBe('pending')
      expect(todo.completedAt).toBeNull()
    })

    it('标记完成后写入完成时间，改回未完成后清空', async () => {
      const created = (
        await app.inject({
          method: 'POST',
          url: '/api/todos',
          headers: teacherHeaders,
          payload: { title: '上传实训室安全检查记录表', dueDate: '2026-10-12', priority: 'high' },
        })
      ).json<Todo>()

      const done = await app.inject({
        method: 'PATCH',
        url: `/api/todos/${created.id}`,
        headers: teacherHeaders,
        payload: { status: 'done' },
      })
      expect(done.statusCode).toBe(200)
      const doneBody = done.json<Todo>()
      expect(doneBody.status).toBe('done')
      expect(doneBody.completedAt).not.toBeNull()

      const reopened = await app.inject({
        method: 'PATCH',
        url: `/api/todos/${created.id}`,
        headers: teacherHeaders,
        payload: { status: 'pending' },
      })
      expect(reopened.json<Todo>().completedAt).toBeNull()

      await app.inject({ method: 'DELETE', url: `/api/todos/${created.id}`, headers: teacherHeaders })
    })

    it('缺少截止日期返回 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/todos',
        headers: teacherHeaders,
        payload: { title: '没有截止日期的待办' },
      })
      expect(response.statusCode).toBe(400)
    })

    it('非法优先级返回 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/todos',
        headers: teacherHeaders,
        payload: { title: '优先级非法', dueDate: '2026-10-12', priority: 'urgent' },
      })
      expect(response.statusCode).toBe(400)
    })

    it('不能修改或删除他人的待办', async () => {
      const mine = (await listTodos())[0]!
      const otherHeaders = authHeaders(session.otherTeacherToken)

      const patch = await app.inject({
        method: 'PATCH',
        url: `/api/todos/${mine.id}`,
        headers: otherHeaders,
        payload: { status: 'done' },
      })
      expect(patch.statusCode).toBe(404)

      const remove = await app.inject({ method: 'DELETE', url: `/api/todos/${mine.id}`, headers: otherHeaders })
      expect(remove.statusCode).toBe(404)
    })

    it('他人的待办列表为空', async () => {
      expect(await listTodos('', authHeaders(session.otherTeacherToken))).toHaveLength(0)
    })
  })
})

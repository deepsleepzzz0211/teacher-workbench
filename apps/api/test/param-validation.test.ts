import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { authHeaders, closeTestApp, createSession, type Session } from './helpers/setup'

const MALFORMED_ID = 'not-a-uuid'
const WELL_FORMED_MISSING_ID = '11111111-1111-4111-8111-111111111111'

interface ValidationCase {
  label: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: Record<string, unknown>
  adminOnly?: boolean
}

const CASES: ValidationCase[] = [
  { label: '更新授课任务', method: 'PATCH', path: '/workload/tasks/:id', body: { totalHours: 40 } },
  { label: '删除授课任务', method: 'DELETE', path: '/workload/tasks/:id' },
  { label: '删除其它工作量', method: 'DELETE', path: '/workload/items/:id' },
  {
    label: '更新教科研成果',
    method: 'PATCH',
    path: '/achievements/:id',
    body: { title: '参数校验用例标题' },
  },
  { label: '删除教科研成果', method: 'DELETE', path: '/achievements/:id' },
  { label: '删除企业实践记录', method: 'DELETE', path: '/practices/:id' },
  { label: '查看通知详情', method: 'GET', path: '/notices/:id' },
  { label: '标记通知已读', method: 'POST', path: '/notices/:id/read' },
  { label: '更新待办', method: 'PATCH', path: '/todos/:id', body: { status: 'done' } },
  { label: '删除待办', method: 'DELETE', path: '/todos/:id' },
  {
    label: '审批申请',
    method: 'POST',
    path: '/applications/:id/review',
    body: { decision: 'approved' },
    adminOnly: true,
  },
]

describe('路由参数校验', () => {
  let app: FastifyInstance
  let session: Session

  beforeAll(async () => {
    session = await createSession()
    app = session.app
  })

  afterAll(async () => {
    await closeTestApp(app)
  })

  for (const item of CASES) {
    it(`${item.label}：非法 ID 返回 400 并给出可读提示`, async () => {
      const response = await app.inject({
        method: item.method,
        url: `/api${item.path.replace(':id', MALFORMED_ID)}`,
        headers: authHeaders(item.adminOnly ? session.adminToken : session.teacherToken),
        payload: item.body,
      })

      expect(
        response.statusCode,
        `${item.method} ${item.path} 期望 400，实际 ${response.statusCode}`,
      ).toBe(400)
      expect(response.json<{ message: string }>().message).toContain('id')
    })
  }

  it('格式合法但不存在的 ID 仍返回 404，未被误判为参数错误', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/todos/${WELL_FORMED_MISSING_ID}`,
      headers: authHeaders(session.teacherToken),
    })
    expect(response.statusCode).toBe(404)
  })

  it('格式合法但不存在的成果 ID 在更新时返回 404', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/achievements/${WELL_FORMED_MISSING_ID}`,
      headers: authHeaders(session.teacherToken),
      payload: { title: '不存在成果的更新尝试' },
    })
    expect(response.statusCode).toBe(404)
  })
})

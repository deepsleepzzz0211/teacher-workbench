import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import type { ApplicationRecord, Paginated } from '@tw/shared'

import { authHeaders, closeTestApp, createSession, type Session } from './helpers/setup'

describe('调课 / 请假审批模块', () => {
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

  async function listApplications(
    query = '',
    headers = teacherHeaders,
  ): Promise<Paginated<ApplicationRecord>> {
    const response = await app.inject({
      method: 'GET',
      url: `/api/applications${query}`,
      headers,
    })
    expect(response.statusCode).toBe(200)
    return response.json<Paginated<ApplicationRecord>>()
  }

  it('教师只能看到自己的 3 条申请', async () => {
    const result = await listApplications()
    expect(result.total).toBe(3)
    expect(result.items.every((item) => item.teacherName === '陈立群')).toBe(true)
  })

  it('管理员可以看到全部 4 条申请', async () => {
    expect((await listApplications('', adminHeaders)).total).toBe(4)
  })

  it('管理员可筛选待审批申请', async () => {
    const result = await listApplications('?status=pending', adminHeaders)
    expect(result.total).toBe(2)
    expect(result.items.every((item) => item.status === 'pending')).toBe(true)
  })

  it('申请列表带出教师姓名与审批人姓名', async () => {
    const result = await listApplications('?status=approved')
    const approved = result.items[0]!
    expect(approved.teacherName).toBe('陈立群')
    expect(approved.reviewerName).toBe('刘建国')
    expect(approved.reviewComment).toContain('同意')
    expect(approved.reviewedAt).not.toBeNull()
  })

  it('教师可提交调课申请，初始状态为待审批', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/applications',
      headers: teacherHeaders,
      payload: {
        type: 'adjust_class',
        originalDate: '2026-09-22',
        originalSection: '第1-4节',
        targetDate: '2026-09-24',
        targetSection: '第5-8节',
        reason: '带队参加省级技能大赛，需要调整数控加工工艺与编程上课时间',
      },
    })

    expect(response.statusCode).toBe(201)
    const created = response.json<ApplicationRecord>()
    expect(created.status).toBe('pending')
    expect(created.type).toBe('adjust_class')
    expect(created.reviewerName).toBeNull()
  })

  it('事由过短返回 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/applications',
      headers: teacherHeaders,
      payload: { type: 'leave', originalDate: '2026-09-22', reason: '有事' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json<{ message: string }>().message).toContain('事由')
  })

  it('教师无权审批申请（403）', async () => {
    const pending = (await listApplications('?status=pending')).items[0]!
    const response = await app.inject({
      method: 'POST',
      url: `/api/applications/${pending.id}/review`,
      headers: teacherHeaders,
      payload: { decision: 'approved', comment: '自己批自己' },
    })
    expect(response.statusCode).toBe(403)
  })

  it('管理员可通过审批，状态与审批信息随之更新', async () => {
    const pending = (await listApplications('?status=pending', adminHeaders)).items[0]!

    const response = await app.inject({
      method: 'POST',
      url: `/api/applications/${pending.id}/review`,
      headers: adminHeaders,
      payload: { decision: 'approved', comment: '同意调课，已同步教务系统' },
    })

    expect(response.statusCode).toBe(200)
    const reviewed = response.json<ApplicationRecord>()
    expect(reviewed.status).toBe('approved')
    expect(reviewed.reviewerName).toBe('刘建国')
    expect(reviewed.reviewComment).toContain('同意调课')
    expect(reviewed.reviewedAt).not.toBeNull()
  })

  it('管理员可驳回申请', async () => {
    const pending = (await listApplications('?status=pending', adminHeaders)).items[0]!
    const response = await app.inject({
      method: 'POST',
      url: `/api/applications/${pending.id}/review`,
      headers: adminHeaders,
      payload: { decision: 'rejected', comment: '与实训室安排冲突' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<ApplicationRecord>().status).toBe('rejected')
  })

  it('审批决定只接受 approved / rejected', async () => {
    const pending = (await listApplications('?status=pending', adminHeaders)).items[0]
    if (!pending) return

    const response = await app.inject({
      method: 'POST',
      url: `/api/applications/${pending.id}/review`,
      headers: adminHeaders,
      payload: { decision: 'pending' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('审批不存在的申请返回 404', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/applications/11111111-1111-4111-8111-111111111111/review',
      headers: adminHeaders,
      payload: { decision: 'approved' },
    })
    expect(response.statusCode).toBe(404)
  })

  it('待审批列表按状态与角色返回不同范围', async () => {
    const teacherPending = (
      await app.inject({ method: 'GET', url: '/api/applications/pending', headers: teacherHeaders })
    ).json<ApplicationRecord[]>()

    const adminPending = (
      await app.inject({ method: 'GET', url: '/api/applications/pending', headers: adminHeaders })
    ).json<ApplicationRecord[]>()

    expect(adminPending.length).toBeGreaterThanOrEqual(teacherPending.length)
    expect(adminPending.every((item) => item.status === 'pending')).toBe(true)
  })

  it('关联不存在的授课任务返回 404', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/applications',
      headers: teacherHeaders,
      payload: {
        type: 'adjust_class',
        taskId: '11111111-1111-4111-8111-111111111111',
        originalDate: '2026-09-22',
        reason: '关联了一个不存在的授课任务用于验证校验逻辑',
      },
    })
    expect(response.statusCode).toBe(404)
  })
})

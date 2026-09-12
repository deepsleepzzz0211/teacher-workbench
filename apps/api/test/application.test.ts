import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { and, count, eq } from 'drizzle-orm'

import type { ApplicationRecord, Paginated } from '@tw/shared'

import { db } from '../src/db/client'
import { applications, users } from '../src/db/schema'
import { hashPassword } from '../src/utils/password'
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

  describe('mine 参数的布尔语义', () => {
    it('管理员传 mine=false 时与不传参数结果一致（均为本院系全部）', async () => {
      const withoutParam = await listApplications('', adminHeaders)
      const explicitFalse = await listApplications('?mine=false', adminHeaders)

      expect(withoutParam.total).toBeGreaterThan(0)
      expect(explicitFalse.total).toBe(withoutParam.total)
    })

    it('管理员传 mine=false 时不应被强制收窄为本人', async () => {
      const explicitFalse = await listApplications('?mine=false', adminHeaders)
      const explicitTrue = await listApplications('?mine=true', adminHeaders)

      expect(explicitFalse.total).toBeGreaterThan(explicitTrue.total)
    })

    it('管理员传 mine=true 时只看自己提交的申请', async () => {
      const result = await listApplications('?mine=true', adminHeaders)
      expect(result.total).toBe(0)
    })

    it('普通教师即使传 mine=false 也只能看到自己的申请', async () => {
      const result = await listApplications('?mine=false')
      expect(result.total).toBeGreaterThan(0)
      expect(result.items.every((item) => item.teacherName === '陈立群')).toBe(true)
    })

    it('mine 取值非法时返回 400 而非静默当成真', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/applications?mine=abc',
        headers: adminHeaders,
      })
      expect(response.statusCode).toBe(400)
      expect(response.json<{ message: string }>().message).toContain('mine')
    })

    it('mine 传 0 同样被拒绝（不做隐式真值推断）', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/applications?mine=0',
        headers: adminHeaders,
      })
      expect(response.statusCode).toBe(400)
    })
  })

  describe('审批的状态守卫与院系范围', () => {
    let otherDeptTeacherId: string
    let otherDeptApplicationId: string
    let selfApplicationId: string | undefined

    beforeAll(async () => {
      const [teacher] = await db
        .insert(users)
        .values({
          username: 'otherdept01',
          passwordHash: hashPassword('Teach@2026'),
          name: '赵外院',
          employeeNo: 'OTHER0001',
          department: '电子信息学院',
          title: '讲师',
          role: 'teacher',
        })
        .returning({ id: users.id })
      otherDeptTeacherId = teacher!.id

      const [application] = await db
        .insert(applications)
        .values({
          teacherId: otherDeptTeacherId,
          type: 'leave',
          originalDate: '2026-09-25',
          originalSection: '第1-2节',
          reason: '其他院系的请假申请，用于验证审批范围隔离',
          status: 'pending',
        })
        .returning({ id: applications.id })
      otherDeptApplicationId = application!.id
    })

    afterAll(async () => {
      if (selfApplicationId) {
        await db.delete(applications).where(eq(applications.id, selfApplicationId))
      }
      await db.delete(users).where(eq(users.id, otherDeptTeacherId))
    })

    it('管理员的待审批列表不含其他院系的申请', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/applications/pending',
        headers: adminHeaders,
      })
      expect(response.statusCode).toBe(200)
      const pending = response.json<ApplicationRecord[]>()
      expect(pending.some((item) => item.id === otherDeptApplicationId)).toBe(false)
    })

    it('管理员的申请列表不含其他院系的申请', async () => {
      const result = await listApplications('', adminHeaders)
      expect(result.items.some((item) => item.id === otherDeptApplicationId)).toBe(false)
    })

    it('审批其他院系的申请被拒绝（按不存在处理）', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/applications/${otherDeptApplicationId}/review`,
        headers: adminHeaders,
        payload: { decision: 'approved', comment: '越权尝试' },
      })
      expect(response.statusCode).toBe(404)
    })

    it('重复审批已处理的申请被拒绝', async () => {
      const approved = (await listApplications('?status=approved', adminHeaders)).items[0]!
      const response = await app.inject({
        method: 'POST',
        url: `/api/applications/${approved.id}/review`,
        headers: adminHeaders,
        payload: { decision: 'rejected', comment: '试图翻转已通过的申请' },
      })
      expect(response.statusCode).toBe(400)
      expect(response.json<{ message: string }>().message).toContain('已')
    })

    it('管理员不能审批自己提交的申请', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/applications',
        headers: adminHeaders,
        payload: {
          type: 'leave',
          originalDate: '2026-09-26',
          originalSection: '第3-4节',
          reason: '管理员自己提交的申请，用于验证自审拦截',
        },
      })
      expect(created.statusCode).toBe(201)
      selfApplicationId = created.json<ApplicationRecord>().id

      const response = await app.inject({
        method: 'POST',
        url: `/api/applications/${selfApplicationId}/review`,
        headers: adminHeaders,
        payload: { decision: 'approved', comment: '自己批自己' },
      })
      expect(response.statusCode).toBe(400)
      expect(response.json<{ message: string }>().message).toContain('自己')
    })

    it('被拒绝的审批不会改变申请状态', async () => {
      const before = await listApplications('?status=approved', adminHeaders)
      await app.inject({
        method: 'POST',
        url: `/api/applications/${before.items[0]!.id}/review`,
        headers: adminHeaders,
        payload: { decision: 'rejected', comment: '越权翻转尝试' },
      })
      const after = await listApplications('?status=approved', adminHeaders)
      expect(after.total).toBe(before.total)
    })

    it('看板的待审批计数同样限定在本院系', async () => {
      const [adminRow] = await db
        .select({ department: users.department })
        .from(users)
        .where(eq(users.username, 'admin'))
        .limit(1)

      const expectedRows = await db
        .select({ value: count() })
        .from(applications)
        .innerJoin(users, eq(applications.teacherId, users.id))
        .where(
          and(eq(applications.status, 'pending'), eq(users.department, adminRow!.department)),
        )
      const expected = expectedRows[0]!.value

      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard',
        headers: adminHeaders,
      })
      const dashboard = response.json<{ counters: { pendingApplications: number } }>()

      expect(dashboard.counters.pendingApplications).toBe(expected)
    })
  })
})

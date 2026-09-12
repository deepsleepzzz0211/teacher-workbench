import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

import type { ClassGroup, Course, TeachingTask, Term, WorkloadItem, WorkloadSummaryView } from '@tw/shared'

import { authHeaders, closeTestApp, createSession, type Session } from './helpers/setup'

interface Catalog {
  termId: string
  courseId: string
  classId: string
}

async function loadCatalog(app: FastifyInstance, token: string): Promise<Catalog> {
  const headers = authHeaders(token)
  const terms = (await app.inject({ method: 'GET', url: '/api/catalog/terms', headers })).json<Term[]>()
  const courses = (await app.inject({ method: 'GET', url: '/api/catalog/courses', headers })).json<Course[]>()
  const classes = (await app.inject({ method: 'GET', url: '/api/catalog/classes', headers })).json<ClassGroup[]>()

  return {
    termId: terms.find((term) => term.isCurrent)!.id,
    courseId: courses.find((course) => course.code === 'JD02002')!.id,
    classId: classes.find((group) => group.name === '汽车检测与维修技术2402')!.id,
  }
}

describe('教学工作量模块', () => {
  let app: FastifyInstance
  let session: Session
  let catalog: Catalog
  let headers: Record<string, string>

  beforeAll(async () => {
    session = await createSession()
    app = session.app
    headers = authHeaders(session.teacherToken)
    catalog = await loadCatalog(app, session.teacherToken)
  })

  afterAll(async () => {
    await closeTestApp(app)
  })

  async function listTasks(token = session.teacherToken): Promise<TeachingTask[]> {
    const response = await app.inject({
      method: 'GET',
      url: '/api/workload/tasks',
      headers: authHeaders(token),
    })
    expect(response.statusCode).toBe(200)
    return response.json<TeachingTask[]>()
  }

  async function summary(token = session.teacherToken): Promise<WorkloadSummaryView> {
    const response = await app.inject({
      method: 'GET',
      url: '/api/workload/summary',
      headers: authHeaders(token),
    })
    expect(response.statusCode).toBe(200)
    return response.json<WorkloadSummaryView>()
  }

  describe('授课任务列表', () => {
    it('返回当前学期 6 条授课任务，按星期与节次排序', async () => {
      const tasks = await listTasks()
      expect(tasks).toHaveLength(6)
      const sortKeys = tasks.map((task) => task.weekday * 100 + task.startSection)
      expect([...sortKeys].sort((a, b) => a - b)).toEqual(sortKeys)
    })

    it('每条任务都带出课程名、班级名与折算学时', async () => {
      const tasks = await listTasks()
      const first = tasks[0]!
      expect(first.courseName).toBeTruthy()
      expect(first.className).toBeTruthy()
      expect(first.effectiveHours).toBeGreaterThan(0)
    })

    it('折算结果符合领域规则：理论课 64 学时 45 人 = 67.2', async () => {
      const tasks = await listTasks()
      const task = tasks.find((item) => item.courseName === '机械制图与CAD' && item.repeatIndex === 1)!
      expect(task.totalHours).toBe(64)
      expect(task.studentCount).toBe(45)
      expect(task.effectiveHours).toBe(67.2)
    })

    it('重复课系数生效：同一课程第二次授课折算为 58.8', async () => {
      const tasks = await listTasks()
      const repeat = tasks.find((item) => item.repeatIndex === 2)!
      expect(repeat.courseName).toBe('机械制图与CAD')
      expect(repeat.studentCount).toBe(42)
      expect(repeat.effectiveHours).toBe(58.8)
    })

    it('实训课 72 学时 38 人 = 86.4', async () => {
      const tasks = await listTasks()
      const task = tasks.find((item) => item.courseName === '数控加工工艺与编程')!
      expect(task.effectiveHours).toBe(86.4)
    })

    it('合班 52 人触发班级规模系数：48 学时理实一体 = 59.1', async () => {
      const tasks = await listTasks()
      const task = tasks.find((item) => item.courseName === 'PLC控制系统安装与调试')!
      expect(task.effectiveHours).toBe(59.1)
    })
  })

  describe('学期工作量汇总', () => {
    it('分别汇总课堂教学与其它工作量', async () => {
      const result = await summary()
      expect(result.taskHours).toBe(384.2)
      expect(result.itemHours).toBe(84)
      expect(result.totalHours).toBe(468.2)
    })

    it('基本工作量取 240 折算学时', async () => {
      expect((await summary()).requiredHours).toBe(240)
    })

    it('达成率保留 3 位小数', async () => {
      expect((await summary()).achievementRate).toBe(1.951)
    })

    it('给出课程类型构成', async () => {
      const result = await summary()
      expect(result.byCourseType.theory).toBe(174)
      expect(result.byCourseType.integrated).toBe(123.8)
      expect(result.byCourseType.practice).toBe(86.4)
      expect(result.byCourseType.internship).toBe(0)
    })

    it('给出其它工作量类别构成', async () => {
      const result = await summary()
      expect(result.byItemCategory.competition_guide).toBe(20)
      expect(result.byItemCategory.thesis_guide).toBe(32)
      expect(result.byItemCategory.internship_guide).toBe(16)
      expect(result.byItemCategory.teaching_research).toBe(16)
      expect(result.byItemCategory.social_training).toBe(0)
    })

    it('给出 20 周的周学时分布', async () => {
      const result = await summary()
      expect(result.weekly).toHaveLength(20)
      expect(result.weekly[0]!.week).toBe(1)
      expect(result.weekly[0]!.hours).toBeGreaterThan(0)
    })
  })

  describe('授课任务增删改', () => {
    let createdId: string

    it('新增授课任务并即时返回折算学时', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workload/tasks',
        headers,
        payload: {
          termId: catalog.termId,
          courseId: catalog.courseId,
          classId: catalog.classId,
          weekday: 3,
          startSection: 1,
          endSection: 2,
          weekStart: 1,
          weekEnd: 16,
          weekParity: 'all',
          totalHours: 40,
          studentCount: 36,
        },
      })

      expect(response.statusCode).toBe(201)
      const task = response.json<TeachingTask>()
      createdId = task.id
      expect(task.effectiveHours).toBe(48)
      expect(task.repeatIndex).toBe(1)
      expect(task.courseName).toBe('工业机器人操作与编程')
      expect(task.className).toBe('汽车检测与维修技术2402')
    })

    it('新增后总数与汇总同步增长', async () => {
      expect(await listTasks()).toHaveLength(7)
      expect((await summary()).totalHours).toBe(516.2)
    })

    it('结束节次早于开始节次被拒绝', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workload/tasks',
        headers,
        payload: {
          termId: catalog.termId,
          courseId: catalog.courseId,
          classId: catalog.classId,
          weekday: 3,
          startSection: 5,
          endSection: 2,
          weekStart: 1,
          weekEnd: 16,
          totalHours: 40,
          studentCount: 36,
        },
      })
      expect(response.statusCode).toBe(400)
      expect(response.json<{ message: string }>().message).toContain('结束节次')
    })

    it('不存在的课程被拒绝', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workload/tasks',
        headers,
        payload: {
          termId: catalog.termId,
          courseId: '11111111-1111-4111-8111-111111111111',
          classId: catalog.classId,
          weekday: 3,
          startSection: 1,
          endSection: 2,
          weekStart: 1,
          weekEnd: 16,
          totalHours: 40,
          studentCount: 36,
        },
      })
      expect(response.statusCode).toBe(400)
    })

    it('修改总学时候折算学时随之变化', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/workload/tasks/${createdId}`,
        headers,
        payload: { totalHours: 50 },
      })
      expect(response.statusCode).toBe(200)
      expect(response.json<TeachingTask>().effectiveHours).toBe(60)
    })

    it('删除后总数恢复', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workload/tasks/${createdId}`,
        headers,
      })
      expect(response.statusCode).toBe(200)
      expect(await listTasks()).toHaveLength(6)
    })

    it('删除不存在的任务返回 404', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workload/tasks/${createdId}`,
        headers,
      })
      expect(response.statusCode).toBe(404)
    })
  })

  describe('其它工作量', () => {
    it('列表返回 4 条并带出折算学时', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/workload/items', headers })
      expect(response.statusCode).toBe(200)
      const items = response.json<WorkloadItem[]>()
      expect(items).toHaveLength(4)

      const competition = items.find((item) => item.category === 'competition_guide')!
      expect(competition.hours).toBe(20)

      const thesis = items.find((item) => item.category === 'thesis_guide')!
      expect(thesis.quantity).toBe(8)
      expect(thesis.hours).toBe(32)
    })

    it('新增社会培训按 1.2 系数折算', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workload/items',
        headers,
        payload: {
          termId: catalog.termId,
          category: 'social_training',
          title: '面向企业职工开展工业机器人操作培训',
          quantity: 10,
          occurredOn: '2026-09-11',
        },
      })

      expect(response.statusCode).toBe(201)
      const item = response.json<WorkloadItem>()
      expect(item.hours).toBe(12)

      await app.inject({ method: 'DELETE', url: `/api/workload/items/${item.id}`, headers })
    })

    it('数量为 0 被拒绝', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workload/items',
        headers,
        payload: {
          termId: catalog.termId,
          category: 'other',
          title: '无数量记录',
          quantity: 0,
          occurredOn: '2026-09-11',
        },
      })
      expect(response.statusCode).toBe(400)
    })
  })

  describe('数据隔离', () => {
    it('另一位教师看不到本人的授课任务', async () => {
      const tasks = await listTasks(session.otherTeacherToken)
      expect(tasks).toHaveLength(1)
      expect(tasks[0]!.courseName).toBe('电气控制线路安装与检修')
    })

    it('另一位教师无法修改本人的授课任务', async () => {
      const [task] = await listTasks()
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/workload/tasks/${task!.id}`,
        headers: authHeaders(session.otherTeacherToken),
        payload: { totalHours: 10 },
      })
      expect(response.statusCode).toBe(404)
    })

    it('另一位教师无法删除本人的授课任务', async () => {
      const [task] = await listTasks()
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workload/tasks/${task!.id}`,
        headers: authHeaders(session.otherTeacherToken),
      })
      expect(response.statusCode).toBe(404)
    })

    it('未登录访问工作量接口返回 401', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/workload/tasks' })
      expect(response.statusCode).toBe(401)
    })
  })
})

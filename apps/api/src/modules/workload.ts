import { and, asc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

import {
  calcItemHours,
  calcTaskEffectiveHours,
  type CourseType,
  distributeByWeek,
  idParamSchema,
  type TeachingTask,
  type TeachingTaskCreateInput,
  teachingTaskCreateSchema,
  teachingTaskUpdateSchema,
  type WeekParity,
  type WorkloadItem,
  workloadItemCreateSchema,
  type WorkloadSummaryView,
  summarizeWorkload,
} from '@tw/shared'

import { db } from '../db/client'
import { classGroups, courses, teachingTasks, terms, workloadItems } from '../db/schema'
import { requireAuth } from '../plugins/auth'
import { requiredHoursOf, resolveTerm } from '../services/common'
import { badRequest, notFound, parseOrThrow } from '../utils/http'

type TaskRow = {
  task: typeof teachingTasks.$inferSelect
  course: typeof courses.$inferSelect
  classGroup: typeof classGroups.$inferSelect
}

function toTeachingTask(row: TaskRow): TeachingTask {
  const { task, course, classGroup } = row
  return {
    id: task.id,
    teacherId: task.teacherId,
    termId: task.termId,
    courseId: task.courseId,
    classId: task.classId,
    courseName: course.name,
    courseCode: course.code,
    courseType: course.courseType as CourseType,
    className: classGroup.name,
    location: task.location,
    weekday: task.weekday,
    startSection: task.startSection,
    endSection: task.endSection,
    weekStart: task.weekStart,
    weekEnd: task.weekEnd,
    weekParity: task.weekParity as WeekParity,
    totalHours: task.totalHours,
    studentCount: task.studentCount,
    repeatIndex: task.repeatIndex,
    remark: task.remark,
    effectiveHours: calcTaskEffectiveHours({
      totalHours: task.totalHours,
      courseType: course.courseType,
      studentCount: task.studentCount,
      repeatIndex: task.repeatIndex,
    }),
    createdAt: task.createdAt.toISOString(),
  }
}

export async function listTasks(teacherId: string, termId: string): Promise<TeachingTask[]> {
  const rows = await db
    .select({ task: teachingTasks, course: courses, classGroup: classGroups })
    .from(teachingTasks)
    .innerJoin(courses, eq(teachingTasks.courseId, courses.id))
    .innerJoin(classGroups, eq(teachingTasks.classId, classGroups.id))
    .where(and(eq(teachingTasks.teacherId, teacherId), eq(teachingTasks.termId, termId)))
    .orderBy(asc(teachingTasks.weekday), asc(teachingTasks.startSection))

  return rows.map(toTeachingTask)
}

function toWorkloadItem(row: typeof workloadItems.$inferSelect): WorkloadItem {
  return {
    id: row.id,
    teacherId: row.teacherId,
    termId: row.termId,
    category: row.category as WorkloadItem['category'],
    title: row.title,
    quantity: row.quantity,
    occurredOn: row.occurredOn,
    remark: row.remark,
    hours: calcItemHours({ category: row.category, quantity: row.quantity }),
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listItems(teacherId: string, termId: string): Promise<WorkloadItem[]> {
  const rows = await db
    .select()
    .from(workloadItems)
    .where(and(eq(workloadItems.teacherId, teacherId), eq(workloadItems.termId, termId)))
    .orderBy(asc(workloadItems.occurredOn))
  return rows.map(toWorkloadItem)
}

async function loadTaskRow(id: string): Promise<TaskRow | undefined> {
  const [row] = await db
    .select({ task: teachingTasks, course: courses, classGroup: classGroups })
    .from(teachingTasks)
    .innerJoin(courses, eq(teachingTasks.courseId, courses.id))
    .innerJoin(classGroups, eq(teachingTasks.classId, classGroups.id))
    .where(eq(teachingTasks.id, id))
    .limit(1)
  return row
}

export async function ensureTermCourseClass(
  termId: string,
  courseId: string,
  classId: string,
): Promise<void> {
  const [term] = await db.select({ id: terms.id }).from(terms).where(eq(terms.id, termId)).limit(1)
  if (!term) throw badRequest('所选学期不存在，请刷新页面后重试')

  const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId)).limit(1)
  if (!course) throw badRequest('所选课程不存在，请刷新页面后重试')

  const [classGroup] = await db
    .select({ id: classGroups.id })
    .from(classGroups)
    .where(eq(classGroups.id, classId))
    .limit(1)
  if (!classGroup) throw badRequest('所选班级不存在，请刷新页面后重试')
}

export async function workloadRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  /* ------------------------------ 汇总视图 ------------------------------ */

  app.get('/summary', async (request): Promise<WorkloadSummaryView> => {
    const { termId } = request.query as { termId?: string }
    const term = await resolveTerm(termId)
    const teacherId = request.currentUser.sub

    const [tasks, items] = await Promise.all([listTasks(teacherId, term.id), listItems(teacherId, term.id)])

    const summary = summarizeWorkload({
      tasks: tasks.map((task) => ({ courseType: task.courseType, effectiveHours: task.effectiveHours })),
      items: items.map((item) => ({ category: item.category, hours: item.hours })),
      requiredHours: requiredHoursOf(term),
    })

    const weekly = distributeByWeek(
      tasks.map((task) => ({
        totalHours: task.totalHours,
        weekStart: task.weekStart,
        weekEnd: task.weekEnd,
        weekParity: task.weekParity,
      })),
    )

    return {
      termId: term.id,
      termName: term.name,
      ...summary,
      weekly,
      taskCount: tasks.length,
      itemCount: items.length,
    }
  })

  /* ------------------------------ 授课任务 ------------------------------ */

  app.get('/tasks', async (request): Promise<TeachingTask[]> => {
    const { termId } = request.query as { termId?: string }
    const term = await resolveTerm(termId)
    return listTasks(request.currentUser.sub, term.id)
  })

  app.post('/tasks', async (request, reply): Promise<TeachingTask> => {
    const input: TeachingTaskCreateInput = parseOrThrow(teachingTaskCreateSchema, request.body)
    await ensureTermCourseClass(input.termId, input.courseId, input.classId)

    const [created] = await db
      .insert(teachingTasks)
      .values({
        teacherId: request.currentUser.sub,
        termId: input.termId,
        courseId: input.courseId,
        classId: input.classId,
        location: input.location,
        weekday: input.weekday,
        startSection: input.startSection,
        endSection: input.endSection,
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        weekParity: input.weekParity,
        totalHours: input.totalHours,
        studentCount: input.studentCount,
        repeatIndex: input.repeatIndex,
        remark: input.remark,
      })
      .returning({ id: teachingTasks.id })

    const row = await loadTaskRow(created!.id)
    reply.status(201)
    return toTeachingTask(row!)
  })

  app.patch('/tasks/:id', async (request): Promise<TeachingTask> => {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const input = parseOrThrow(teachingTaskUpdateSchema, request.body)

    const [existing] = await db.select().from(teachingTasks).where(eq(teachingTasks.id, id)).limit(1)
    if (!existing || existing.teacherId !== request.currentUser.sub) throw notFound('授课任务不存在')

    const termId = input.termId ?? existing.termId
    const courseId = input.courseId ?? existing.courseId
    const classId = input.classId ?? existing.classId
    await ensureTermCourseClass(termId, courseId, classId)

    await db
      .update(teachingTasks)
      .set({
        ...(input.termId !== undefined ? { termId: input.termId } : {}),
        ...(input.courseId !== undefined ? { courseId: input.courseId } : {}),
        ...(input.classId !== undefined ? { classId: input.classId } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.weekday !== undefined ? { weekday: input.weekday } : {}),
        ...(input.startSection !== undefined ? { startSection: input.startSection } : {}),
        ...(input.endSection !== undefined ? { endSection: input.endSection } : {}),
        ...(input.weekStart !== undefined ? { weekStart: input.weekStart } : {}),
        ...(input.weekEnd !== undefined ? { weekEnd: input.weekEnd } : {}),
        ...(input.weekParity !== undefined ? { weekParity: input.weekParity } : {}),
        ...(input.totalHours !== undefined ? { totalHours: input.totalHours } : {}),
        ...(input.studentCount !== undefined ? { studentCount: input.studentCount } : {}),
        ...(input.repeatIndex !== undefined ? { repeatIndex: input.repeatIndex } : {}),
        ...(input.remark !== undefined ? { remark: input.remark } : {}),
      })
      .where(eq(teachingTasks.id, id))

    const row = await loadTaskRow(id)
    return toTeachingTask(row!)
  })

  app.delete('/tasks/:id', async (request, reply): Promise<{ ok: true }> => {
    const { id } = request.params as { id: string }
    const [existing] = await db.select().from(teachingTasks).where(eq(teachingTasks.id, id)).limit(1)
    if (!existing || existing.teacherId !== request.currentUser.sub) throw notFound('授课任务不存在')

    await db.delete(teachingTasks).where(eq(teachingTasks.id, id))
    reply.status(200)
    return { ok: true }
  })

  /* ----------------------------- 其它工作量 ----------------------------- */

  app.get('/items', async (request): Promise<WorkloadItem[]> => {
    const { termId } = request.query as { termId?: string }
    const term = await resolveTerm(termId)
    return listItems(request.currentUser.sub, term.id)
  })

  app.post('/items', async (request, reply): Promise<WorkloadItem> => {
    const input = parseOrThrow(workloadItemCreateSchema, request.body)

    const [term] = await db.select({ id: terms.id }).from(terms).where(eq(terms.id, input.termId)).limit(1)
    if (!term) throw badRequest('所选学期不存在，请刷新页面后重试')

    const [created] = await db
      .insert(workloadItems)
      .values({
        teacherId: request.currentUser.sub,
        termId: input.termId,
        category: input.category,
        title: input.title,
        quantity: input.quantity,
        occurredOn: input.occurredOn,
        remark: input.remark,
      })
      .returning()

    reply.status(201)
    return toWorkloadItem(created!)
  })

  app.delete('/items/:id', async (request, reply): Promise<{ ok: true }> => {
    const { id } = request.params as { id: string }
    const [existing] = await db.select().from(workloadItems).where(eq(workloadItems.id, id)).limit(1)
    if (!existing || existing.teacherId !== request.currentUser.sub) throw notFound('工作量记录不存在')

    await db.delete(workloadItems).where(eq(workloadItems.id, id))
    reply.status(200)
    return { ok: true }
  })
}

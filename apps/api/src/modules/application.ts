import { and, asc, count, desc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { FastifyInstance } from 'fastify'

import {
  APPLICATION_STATUS_LABELS,
  type ApplicationRecord,
  type ApplicationStatus,
  type ApplicationType,
  applicationCreateSchema,
  applicationQuerySchema,
  applicationReviewSchema,
  idParamSchema,
  type Paginated,
} from '@tw/shared'

import { db } from '../db/client'
import { applications, classGroups, courses, teachingTasks, users } from '../db/schema'
import { assertRole, requireAuth } from '../plugins/auth'
import { badRequest, notFound, parseOrThrow } from '../utils/http'

const reviewerUsers = alias(users, 'reviewer_users')

type ApplicationRow = {
  application: typeof applications.$inferSelect
  teacherName: string | null
  courseName: string | null
  className: string | null
  reviewerName: string | null
}

function toApplication(row: ApplicationRow): ApplicationRecord {
  const { application } = row
  return {
    id: application.id,
    teacherId: application.teacherId,
    teacherName: row.teacherName ?? '',
    type: application.type as ApplicationType,
    taskId: application.taskId,
    courseName: row.courseName,
    className: row.className,
    originalDate: application.originalDate,
    originalSection: application.originalSection,
    targetDate: application.targetDate,
    targetSection: application.targetSection,
    reason: application.reason,
    status: application.status as ApplicationStatus,
    reviewerId: application.reviewerId,
    reviewerName: row.reviewerName,
    reviewComment: application.reviewComment,
    reviewedAt: application.reviewedAt ? application.reviewedAt.toISOString() : null,
    createdAt: application.createdAt.toISOString(),
  }
}

function baseQuery() {
  return db
    .select({
      application: applications,
      teacherName: users.name,
      courseName: courses.name,
      className: classGroups.name,
      reviewerName: reviewerUsers.name,
    })
    .from(applications)
    .leftJoin(users, eq(applications.teacherId, users.id))
    .leftJoin(teachingTasks, eq(applications.taskId, teachingTasks.id))
    .leftJoin(courses, eq(teachingTasks.courseId, courses.id))
    .leftJoin(classGroups, eq(teachingTasks.classId, classGroups.id))
    .leftJoin(reviewerUsers, eq(applications.reviewerId, reviewerUsers.id))
}

async function currentUserDepartment(userId: string): Promise<string> {
  const [row] = await db
    .select({ department: users.department })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!row) throw notFound('用户不存在')
  return row.department
}

function applicationCountQuery() {
  return db
    .select({ value: count() })
    .from(applications)
    .innerJoin(users, eq(applications.teacherId, users.id))
}

export async function applicationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request): Promise<Paginated<ApplicationRecord>> => {
    const query = parseOrThrow(applicationQuerySchema, request.query)
    const isAdmin = request.currentUser.role === 'dept_admin'
    const onlyMine = query.mine === true || !isAdmin

    const scope = onlyMine
      ? eq(applications.teacherId, request.currentUser.sub)
      : eq(users.department, await currentUserDepartment(request.currentUser.sub))
    const where = query.status ? and(scope, eq(applications.status, query.status)) : scope

    const [rows, totalRow] = await Promise.all([
      baseQuery()
        .where(where)
        .orderBy(desc(applications.createdAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      applicationCountQuery().where(where),
    ])

    return {
      items: rows.map(toApplication),
      total: totalRow[0]?.value ?? 0,
      page: query.page,
      pageSize: query.pageSize,
    }
  })

  app.get('/pending', async (request): Promise<ApplicationRecord[]> => {
    const isAdmin = request.currentUser.role === 'dept_admin'
    const scope = isAdmin
      ? eq(users.department, await currentUserDepartment(request.currentUser.sub))
      : eq(applications.teacherId, request.currentUser.sub)

    const rows = await baseQuery()
      .where(and(scope, eq(applications.status, 'pending')))
      .orderBy(asc(applications.createdAt))
      .limit(50)
    return rows.map(toApplication)
  })

  app.post('/', async (request, reply): Promise<ApplicationRecord> => {
    const input = parseOrThrow(applicationCreateSchema, request.body)

    if (input.taskId) {
      const [task] = await db
        .select({ id: teachingTasks.id })
        .from(teachingTasks)
        .where(and(eq(teachingTasks.id, input.taskId), eq(teachingTasks.teacherId, request.currentUser.sub)))
        .limit(1)
      if (!task) throw notFound('关联的授课任务不存在')
    }

    const [created] = await db
      .insert(applications)
      .values({
        teacherId: request.currentUser.sub,
        type: input.type,
        taskId: input.taskId ?? null,
        originalDate: input.originalDate,
        originalSection: input.originalSection,
        targetDate: input.targetDate ?? null,
        targetSection: input.targetSection,
        reason: input.reason,
        status: 'pending',
      })
      .returning({ id: applications.id })

    const rows = await baseQuery().where(eq(applications.id, created!.id)).limit(1)
    reply.status(201)
    return toApplication(rows[0]!)
  })

  app.post('/:id/review', async (request): Promise<ApplicationRecord> => {
    assertRole(request, 'dept_admin')
    const { id } = parseOrThrow(idParamSchema, request.params)
    const input = parseOrThrow(applicationReviewSchema, request.body)

    const [existing] = await db.select().from(applications).where(eq(applications.id, id)).limit(1)
    if (!existing) throw notFound('申请不存在')

    if (existing.teacherId === request.currentUser.sub) {
      throw badRequest('不能审批自己提交的申请')
    }

    const [applicant] = await db
      .select({ department: users.department })
      .from(users)
      .where(eq(users.id, existing.teacherId))
      .limit(1)
    const department = await currentUserDepartment(request.currentUser.sub)
    if (!applicant || applicant.department !== department) throw notFound('申请不存在')

    if (existing.status !== 'pending') {
      const label =
        APPLICATION_STATUS_LABELS[existing.status as ApplicationStatus] ?? existing.status
      throw badRequest(`该申请已是「${label}」状态，不能重复审批`)
    }

    await db
      .update(applications)
      .set({
        status: input.decision,
        reviewerId: request.currentUser.sub,
        reviewComment: input.comment,
        reviewedAt: new Date(),
      })
      .where(eq(applications.id, id))

    const rows = await baseQuery().where(eq(applications.id, id)).limit(1)
    return toApplication(rows[0]!)
  })
}

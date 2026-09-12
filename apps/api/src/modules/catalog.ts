import { asc } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

import type { ClassGroup, Course, CourseType, Term } from '@tw/shared'

import { db } from '../db/client'
import { classGroups, courses, terms } from '../db/schema'
import { requireAuth } from '../plugins/auth'

/**
 * 基础数据：学期、课程库、班级库。
 * 这些数据由教务维护，教师端只读，用于授课任务表单的下拉选择。
 */
export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/terms', async (): Promise<Term[]> => {
    const rows = await db.select().from(terms).orderBy(asc(terms.startDate))
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      startDate: row.startDate,
      endDate: row.endDate,
      isCurrent: row.isCurrent,
    }))
  })

  app.get('/courses', async (): Promise<Course[]> => {
    const rows = await db.select().from(courses).orderBy(asc(courses.code))
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      courseType: row.courseType as CourseType,
      credits: row.credits,
      hours: row.hours,
    }))
  })

  app.get('/classes', async (): Promise<ClassGroup[]> => {
    const rows = await db.select().from(classGroups).orderBy(asc(classGroups.name))
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      major: row.major,
      grade: row.grade,
      studentCount: row.studentCount,
    }))
  })
}

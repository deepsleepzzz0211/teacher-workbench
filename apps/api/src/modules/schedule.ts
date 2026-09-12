import type { FastifyInstance } from 'fastify'

import { type CourseType, type ScheduleEntry, scheduleQuerySchema, type Term } from '@tw/shared'

import { requireAuth } from '../plugins/auth'
import { matchesWeekParity, resolveTerm, weekOfTerm } from '../services/common'
import { parseOrThrow } from '../utils/http'
import { listTasks } from './workload'

export interface ScheduleResult {
  term: Term
  week: number
  entries: ScheduleEntry[]
}

export async function scheduleRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request): Promise<ScheduleResult> => {
    const query = parseOrThrow(scheduleQuerySchema, request.query)
    const term = await resolveTerm(query.termId)
    const week = query.week ?? weekOfTerm(term)

    const tasks = await listTasks(request.currentUser.sub, term.id)
    const entries = tasks
      .filter(
        (task) =>
          task.weekStart <= week && task.weekEnd >= week && matchesWeekParity(task.weekParity, week),
      )
      .map<ScheduleEntry>((task) => ({
        taskId: task.id,
        courseName: task.courseName,
        courseType: task.courseType as CourseType,
        className: task.className,
        location: task.location,
        weekday: task.weekday,
        startSection: task.startSection,
        endSection: task.endSection,
        weekStart: task.weekStart,
        weekEnd: task.weekEnd,
        weekParity: task.weekParity,
      }))

    return { term, week, entries }
  })
}

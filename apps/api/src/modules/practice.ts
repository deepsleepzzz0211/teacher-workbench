import { and, desc, eq, gte } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

import {
  type EnterprisePractice,
  type PracticeProgress,
  PRACTICE_REQUIRED_DAYS,
  PRACTICE_WINDOW_YEARS,
  practiceCreateSchema,
  resolvePracticeDays,
} from '@tw/shared'

import { db } from '../db/client'
import { enterprisePractices } from '../db/schema'
import { requireAuth } from '../plugins/auth'
import { toDateString } from '../services/common'
import { notFound, parseOrThrow } from '../utils/http'

type PracticeRow = typeof enterprisePractices.$inferSelect

function toPractice(row: PracticeRow): EnterprisePractice {
  return {
    id: row.id,
    teacherId: row.teacherId,
    company: row.company,
    position: row.position,
    startDate: row.startDate,
    endDate: row.endDate,
    days: row.days,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  }
}

export function practiceWindowStart(today: Date = new Date()): string {
  const start = new Date(today.getTime())
  start.setFullYear(start.getFullYear() - PRACTICE_WINDOW_YEARS)
  return toDateString(start)
}

/** 近 5 年累计企业实践天数与政策要求的达成进度 */
export async function buildPracticeProgress(teacherId: string): Promise<PracticeProgress> {
  const windowStart = practiceWindowStart()

  const rows = await db
    .select()
    .from(enterprisePractices)
    .where(and(eq(enterprisePractices.teacherId, teacherId), gte(enterprisePractices.startDate, windowStart)))
    .orderBy(desc(enterprisePractices.startDate))

  const accumulatedDays = rows.reduce((sum, row) => sum + row.days, 0)
  const rate = Math.round((accumulatedDays / PRACTICE_REQUIRED_DAYS) * 1000) / 1000

  return {
    accumulatedDays,
    requiredDays: PRACTICE_REQUIRED_DAYS,
    rate,
    remainingDays: Math.max(0, PRACTICE_REQUIRED_DAYS - accumulatedDays),
    records: rows.map(toPractice),
  }
}

export async function practiceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request): Promise<PracticeProgress> => buildPracticeProgress(request.currentUser.sub))

  app.post('/', async (request, reply): Promise<EnterprisePractice> => {
    const input = parseOrThrow(practiceCreateSchema, request.body)

    const [created] = await db
      .insert(enterprisePractices)
      .values({
        teacherId: request.currentUser.sub,
        company: input.company,
        position: input.position,
        startDate: input.startDate,
        endDate: input.endDate,
        days: resolvePracticeDays(input),
        description: input.description,
      })
      .returning()

    reply.status(201)
    return toPractice(created!)
  })

  app.delete('/:id', async (request): Promise<{ ok: true }> => {
    const { id } = request.params as { id: string }
    const [existing] = await db
      .select()
      .from(enterprisePractices)
      .where(eq(enterprisePractices.id, id))
      .limit(1)
    if (!existing || existing.teacherId !== request.currentUser.sub) throw notFound('企业实践记录不存在')

    await db.delete(enterprisePractices).where(eq(enterprisePractices.id, id))
    return { ok: true }
  })
}

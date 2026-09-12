import { and, asc, count, desc, eq, gte, lte } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LEVELS,
  type Achievement,
  type AchievementCategory,
  achievementCreateSchema,
  achievementQuerySchema,
  type AchievementLevel,
  type AchievementStats,
  achievementUpdateSchema,
  calcAchievementPoints,
  type Paginated,
} from '@tw/shared'

import { db } from '../db/client'
import { achievements } from '../db/schema'
import { requireAuth } from '../plugins/auth'
import { notFound, parseOrThrow } from '../utils/http'

type AchievementRow = typeof achievements.$inferSelect

function toAchievement(row: AchievementRow): Achievement {
  return {
    id: row.id,
    teacherId: row.teacherId,
    category: row.category as AchievementCategory,
    title: row.title,
    level: row.level as AchievementLevel,
    role: row.role,
    achievedOn: row.achievedOn,
    score: row.score ?? calcAchievementPoints(row.level),
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  }
}

function emptyCategoryCount(): Record<AchievementCategory, number> {
  return ACHIEVEMENT_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = 0
      return acc
    },
    {} as Record<AchievementCategory, number>,
  )
}

function emptyLevelCount(): Record<AchievementLevel, number> {
  return ACHIEVEMENT_LEVELS.reduce(
    (acc, level) => {
      acc[level] = 0
      return acc
    },
    {} as Record<AchievementLevel, number>,
  )
}

export async function computeAchievementStats(teacherId: string): Promise<AchievementStats> {
  const rows = await db
    .select()
    .from(achievements)
    .where(eq(achievements.teacherId, teacherId))

  const byCategory = emptyCategoryCount()
  const byLevel = emptyLevelCount()
  let scoreSum = 0

  for (const row of rows) {
    const category = row.category as AchievementCategory
    if (category in byCategory) byCategory[category] += 1
    const level = row.level as AchievementLevel
    if (level in byLevel) byLevel[level] += 1
    scoreSum += row.score ?? calcAchievementPoints(row.level)
  }

  return {
    total: rows.length,
    scoreSum: Math.round(scoreSum * 10) / 10,
    byCategory,
    byLevel,
  }
}

export async function recentAchievements(teacherId: string, limit = 5): Promise<Achievement[]> {
  const rows = await db
    .select()
    .from(achievements)
    .where(eq(achievements.teacherId, teacherId))
    .orderBy(desc(achievements.achievedOn))
    .limit(limit)
  return rows.map(toAchievement)
}

export async function achievementRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request): Promise<Paginated<Achievement>> => {
    const query = parseOrThrow(achievementQuerySchema, request.query)
    const teacherId = request.currentUser.sub

    const filters = [eq(achievements.teacherId, teacherId)]
    if (query.category) filters.push(eq(achievements.category, query.category))
    if (query.level) filters.push(eq(achievements.level, query.level))
    if (query.from) filters.push(gte(achievements.achievedOn, query.from))
    if (query.to) filters.push(lte(achievements.achievedOn, query.to))

    const where = and(...filters)

    const [rows, totalRow] = await Promise.all([
      db
        .select()
        .from(achievements)
        .where(where)
        .orderBy(desc(achievements.achievedOn), asc(achievements.title))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(achievements).where(where),
    ])

    return {
      items: rows.map(toAchievement),
      total: totalRow[0]?.value ?? 0,
      page: query.page,
      pageSize: query.pageSize,
    }
  })

  app.get('/stats', async (request): Promise<AchievementStats> =>
    computeAchievementStats(request.currentUser.sub),
  )

  app.post('/', async (request, reply): Promise<Achievement> => {
    const input = parseOrThrow(achievementCreateSchema, request.body)

    const [created] = await db
      .insert(achievements)
      .values({
        teacherId: request.currentUser.sub,
        category: input.category,
        title: input.title,
        level: input.level,
        role: input.role,
        achievedOn: input.achievedOn,
        score: input.score ?? calcAchievementPoints(input.level),
        description: input.description,
      })
      .returning()

    reply.status(201)
    return toAchievement(created!)
  })

  app.patch('/:id', async (request): Promise<Achievement> => {
    const { id } = request.params as { id: string }
    const input = parseOrThrow(achievementUpdateSchema, request.body)

    const [existing] = await db.select().from(achievements).where(eq(achievements.id, id)).limit(1)
    if (!existing || existing.teacherId !== request.currentUser.sub) throw notFound('成果记录不存在')

    const level = input.level ?? (existing.level as AchievementLevel)
    const scoreExplicitlyProvided = input.score !== undefined
    const levelChanged = input.level !== undefined

    await db
      .update(achievements)
      .set({
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.level !== undefined ? { level: input.level } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.achievedOn !== undefined ? { achievedOn: input.achievedOn } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(scoreExplicitlyProvided || levelChanged
          ? { score: input.score ?? calcAchievementPoints(level) }
          : {}),
      })
      .where(eq(achievements.id, id))

    const [updated] = await db.select().from(achievements).where(eq(achievements.id, id)).limit(1)
    return toAchievement(updated!)
  })

  app.delete('/:id', async (request): Promise<{ ok: true }> => {
    const { id } = request.params as { id: string }
    const [existing] = await db.select().from(achievements).where(eq(achievements.id, id)).limit(1)
    if (!existing || existing.teacherId !== request.currentUser.sub) throw notFound('成果记录不存在')

    await db.delete(achievements).where(eq(achievements.id, id))
    return { ok: true }
  })
}

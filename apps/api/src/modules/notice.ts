import { and, count, desc, eq, isNull } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

import {
  type Notice,
  type NoticeCategory,
  idParamSchema,
  noticeCreateSchema,
  type NoticeListResult,
  paginationQuerySchema,
} from '@tw/shared'

import { db } from '../db/client'
import { notices, noticeReads, users } from '../db/schema'
import { assertRole, requireAuth } from '../plugins/auth'
import { notFound, parseOrThrow } from '../utils/http'

type NoticeRow = {
  notice: typeof notices.$inferSelect
  publisherName: string | null
  readAt: Date | null
}

function toNotice(row: NoticeRow): Notice {
  return {
    id: row.notice.id,
    title: row.notice.title,
    content: row.notice.content,
    category: row.notice.category as NoticeCategory,
    isTop: row.notice.isTop,
    publisherId: row.notice.publisherId,
    publisherName: row.publisherName ?? '教务处',
    publishedAt: row.notice.publishedAt.toISOString(),
    isRead: row.readAt !== null,
  }
}

function baseQuery(userId: string) {
  return db
    .select({
      notice: notices,
      publisherName: users.name,
      readAt: noticeReads.readAt,
    })
    .from(notices)
    .leftJoin(users, eq(notices.publisherId, users.id))
    .leftJoin(
      noticeReads,
      and(eq(noticeReads.noticeId, notices.id), eq(noticeReads.userId, userId)),
    )
}

export async function noticeRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request): Promise<NoticeListResult> => {
    const query = parseOrThrow(paginationQuerySchema, request.query)
    const userId = request.currentUser.sub

    const [rows, totalRow, unreadRow] = await Promise.all([
      baseQuery(userId)
        .orderBy(desc(notices.isTop), desc(notices.publishedAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(notices),
      db
        .select({ value: count() })
        .from(notices)
        .leftJoin(
          noticeReads,
          and(eq(noticeReads.noticeId, notices.id), eq(noticeReads.userId, userId)),
        )
        .where(isNull(noticeReads.readAt)),
    ])

    return {
      items: rows.map(toNotice),
      total: totalRow[0]?.value ?? 0,
      page: query.page,
      pageSize: query.pageSize,
      unreadCount: unreadRow[0]?.value ?? 0,
    }
  })

  app.get('/:id', async (request): Promise<Notice> => {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const rows = await baseQuery(request.currentUser.sub).where(eq(notices.id, id)).limit(1)
    if (rows.length === 0) throw notFound('通知不存在')
    return toNotice(rows[0]!)
  })

  app.post('/:id/read', async (request): Promise<{ ok: true; isRead: true }> => {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const [notice] = await db.select({ id: notices.id }).from(notices).where(eq(notices.id, id)).limit(1)
    if (!notice) throw notFound('通知不存在')

    await db
      .insert(noticeReads)
      .values({ noticeId: id, userId: request.currentUser.sub })
      .onConflictDoNothing()

    return { ok: true, isRead: true }
  })

  app.post('/', async (request, reply): Promise<Notice> => {
    assertRole(request, 'dept_admin')
    const input = parseOrThrow(noticeCreateSchema, request.body)

    const [created] = await db
      .insert(notices)
      .values({
        title: input.title,
        content: input.content,
        category: input.category,
        isTop: input.isTop,
        publisherId: request.currentUser.sub,
      })
      .returning({ id: notices.id })

    const rows = await baseQuery(request.currentUser.sub).where(eq(notices.id, created!.id)).limit(1)
    reply.status(201)
    return toNotice(rows[0]!)
  })
}

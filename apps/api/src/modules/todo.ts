import { and, asc, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

import {
  type Todo,
  type TodoPriority,
  todoCreateSchema,
  type TodoStatus,
  todoUpdateSchema,
} from '@tw/shared'

import { db } from '../db/client'
import { todos } from '../db/schema'
import { requireAuth } from '../plugins/auth'
import { notFound, parseOrThrow } from '../utils/http'

type TodoRow = typeof todos.$inferSelect

function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    teacherId: row.teacherId,
    title: row.title,
    dueDate: row.dueDate,
    priority: row.priority as TodoPriority,
    status: row.status as TodoStatus,
    relatedType: row.relatedType,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  }
}

export async function todoRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request): Promise<Todo[]> => {
    const { status } = request.query as { status?: string }
    const filters = [eq(todos.teacherId, request.currentUser.sub)]
    if (status === 'pending' || status === 'done') filters.push(eq(todos.status, status))

    const rows = await db
      .select()
      .from(todos)
      .where(and(...filters))
      .orderBy(sql`case when ${todos.status} = 'done' then 1 else 0 end`, asc(todos.dueDate))

    return rows.map(toTodo)
  })

  app.post('/', async (request, reply): Promise<Todo> => {
    const input = parseOrThrow(todoCreateSchema, request.body)

    const [created] = await db
      .insert(todos)
      .values({
        teacherId: request.currentUser.sub,
        title: input.title,
        dueDate: input.dueDate,
        priority: input.priority,
        relatedType: input.relatedType,
      })
      .returning()

    reply.status(201)
    return toTodo(created!)
  })

  app.patch('/:id', async (request): Promise<Todo> => {
    const { id } = request.params as { id: string }
    const input = parseOrThrow(todoUpdateSchema, request.body)

    const [existing] = await db.select().from(todos).where(eq(todos.id, id)).limit(1)
    if (!existing || existing.teacherId !== request.currentUser.sub) throw notFound('待办不存在')

    const nextStatus = input.status ?? (existing.status as TodoStatus)

    await db
      .update(todos)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.relatedType !== undefined ? { relatedType: input.relatedType } : {}),
        status: nextStatus,
        completedAt: nextStatus === 'done' ? (existing.completedAt ?? new Date()) : null,
      })
      .where(eq(todos.id, id))

    const [updated] = await db.select().from(todos).where(eq(todos.id, id)).limit(1)
    return toTodo(updated!)
  })

  app.delete('/:id', async (request): Promise<{ ok: true }> => {
    const { id } = request.params as { id: string }
    const [existing] = await db.select().from(todos).where(eq(todos.id, id)).limit(1)
    if (!existing || existing.teacherId !== request.currentUser.sub) throw notFound('待办不存在')

    await db.delete(todos).where(eq(todos.id, id))
    return { ok: true }
  })
}

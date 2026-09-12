import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

import { type AuthUser, type LoginResponse, loginSchema, type Role } from '@tw/shared'

import { db } from '../db/client'
import { users } from '../db/schema'
import { requireAuth } from '../plugins/auth'
import { notFound, parseOrThrow, unauthorized } from '../utils/http'
import { verifyPassword } from '../utils/password'

type UserRow = typeof users.$inferSelect

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    employeeNo: row.employeeNo,
    department: row.department,
    title: row.title,
    role: row.role as Role,
    email: row.email,
    phone: row.phone,
  }
}

export async function authRoutes(
  app: FastifyInstance,
  options: { loginLimit: { max: number; timeWindow: string } },
): Promise<void> {
  app.post('/login', { config: { rateLimit: options.loginLimit } }, async (request): Promise<LoginResponse> => {
    const input = parseOrThrow(loginSchema, request.body)

    const [user] = await db.select().from(users).where(eq(users.username, input.username)).limit(1)
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw unauthorized('用户名或密码不正确')
    }

    const token = app.jwt.sign({
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role as Role,
    })

    return { token, user: toAuthUser(user) }
  })

  app.get('/me', { preHandler: requireAuth }, async (request): Promise<AuthUser> => {
    const [user] = await db.select().from(users).where(eq(users.id, request.currentUser.sub)).limit(1)
    if (!user) throw notFound('用户不存在')
    return toAuthUser(user)
  })
}

import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Role } from '@tw/shared'

import { forbidden, unauthorized } from '../utils/http'

export interface JwtPayload {
  sub: string
  username: string
  name: string
  role: Role
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    /** 已认证用户；仅在 requireAuth 之后可用 */
    currentUser: JwtPayload
  }
}

/** 认证守卫：挂在需要登录的路由的 preHandler 上 */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    throw unauthorized()
  }
  request.currentUser = request.user
}

/** 角色守卫工厂：requireRole('dept_admin') */
export function requireRole(role: Role) {
  return async function roleGuard(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (request.currentUser?.role !== role) {
      throw forbidden(role === 'dept_admin' ? '该操作仅限院系管理员' : '没有权限执行该操作')
    }
  }
}

/** 便捷断言，供路由内部使用 */
export function assertRole(request: FastifyRequest, role: Role): void {
  if (request.currentUser?.role !== role) {
    throw forbidden(role === 'dept_admin' ? '该操作仅限院系管理员' : '没有权限执行该操作')
  }
}

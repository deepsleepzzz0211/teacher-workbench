import { eq, type SQL } from 'drizzle-orm'

import { db } from '../db/client'
import { applications, users } from '../db/schema'
import { notFound } from '../utils/http'

/** 管理员默认看本院系全部；普通教师、或显式要求只看本人时，收窄为本人。 */
export function resolveOnlyMine(role: string, mine?: boolean): boolean {
  return mine === true || role !== 'dept_admin'
}

export async function getDepartmentOf(userId: string): Promise<string> {
  const [row] = await db
    .select({ department: users.department })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!row) throw notFound('用户不存在')
  return row.department
}

/**
 * 申请数据的可见范围。查询需带上 `users` 关联（`applications.teacherId = users.id`）。
 * `department` 可传入调用方已知的院系，避免重复查询。
 */
export async function resolveApplicationScope(params: {
  userId: string
  role: string
  onlyMine: boolean
  department?: string
}): Promise<SQL> {
  if (params.onlyMine) return eq(applications.teacherId, params.userId)
  const department = params.department ?? (await getDepartmentOf(params.userId))
  return eq(users.department, department)
}

export async function isSameDepartment(userId: string, otherUserId: string): Promise<boolean> {
  const [mine, theirs] = await Promise.all([
    getDepartmentOf(userId),
    getDepartmentOf(otherUserId),
  ])
  return mine === theirs
}

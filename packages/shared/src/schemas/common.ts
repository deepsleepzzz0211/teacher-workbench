import { z } from 'zod'

/** 日期字符串 YYYY-MM-DD（避免依赖具体 zod 版本提供的 date() API） */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期需为 YYYY-MM-DD 格式')

export const uuidSchema = z.string().uuid('需要合法的 UUID')

export const idParamSchema = z.object({ id: uuidSchema })

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

/** 把 zod 校验错误压成前端可直接展示的一句话 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    })
    .join('；')
}

/** 计算两个日期之间包含首尾的天数；非法或倒置返回 0 */
export function inclusiveDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0
  return Math.floor((end - start) / 86_400_000) + 1
}

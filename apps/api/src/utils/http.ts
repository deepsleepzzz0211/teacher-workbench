import type { ZodError, ZodType } from 'zod'

import { formatZodError } from '@tw/shared'

/** 带 HTTP 状态码的业务异常，统一由错误处理插件转成响应 */
export class HttpError extends Error {
  readonly statusCode: number
  readonly code: string | undefined

  constructor(statusCode: number, message: string, code?: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.code = code
  }
}

export const badRequest = (message: string, code?: string): HttpError =>
  new HttpError(400, message, code)

export const unauthorized = (message = '登录状态已失效，请重新登录'): HttpError =>
  new HttpError(401, message, 'UNAUTHORIZED')

export const forbidden = (message = '没有权限执行该操作'): HttpError =>
  new HttpError(403, message, 'FORBIDDEN')

export const notFound = (message = '请求的资源不存在'): HttpError =>
  new HttpError(404, message, 'NOT_FOUND')

/** 解析 zod schema，失败时抛出 400 并带上可读的字段信息 */
export function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new HttpError(400, formatZodError(result.error as ZodError), 'VALIDATION_ERROR')
  }
  return result.data
}

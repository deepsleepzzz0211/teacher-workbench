import type { FastifyInstance } from 'fastify'

import { HttpError } from '../utils/http'

/**
 * 统一错误处理：
 * - 业务异常（HttpError）保留状态码与提示信息
 * - 其余异常记录日志并返回通用提示，避免泄漏内部细节
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      message: `接口不存在：${request.method} ${request.url}`,
      code: 'ROUTE_NOT_FOUND',
    })
  })

  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof HttpError) {
      reply.status(error.statusCode).send({
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
      })
      return
    }

    const candidate = error as { statusCode?: number; message?: string; code?: string }
    const statusCode = typeof candidate.statusCode === 'number' ? candidate.statusCode : 500

    if (statusCode >= 400 && statusCode < 500) {
      reply.status(statusCode).send({
        message: candidate.message || '请求不合法',
        code: candidate.code ?? 'BAD_REQUEST',
      })
      return
    }

    request.log.error({ err: error }, '未预期的服务端错误')
    reply.status(500).send({
      message: '服务器开小差了，请稍后重试',
      code: 'INTERNAL_ERROR',
    })
  })
}

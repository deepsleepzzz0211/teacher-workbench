import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import Fastify, { type FastifyInstance } from 'fastify'

import { env } from './config/env'
import { achievementRoutes } from './modules/achievement'
import { applicationRoutes } from './modules/application'
import { authRoutes } from './modules/auth'
import { catalogRoutes } from './modules/catalog'
import { dashboardRoutes } from './modules/dashboard'
import { noticeRoutes } from './modules/notice'
import { practiceRoutes } from './modules/practice'
import { scheduleRoutes } from './modules/schedule'
import { todoRoutes } from './modules/todo'
import { workloadRoutes } from './modules/workload'
import { registerErrorHandler } from './plugins/errors'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.isTest ? false : { level: 'info' },
    trustProxy: true,
  })

  await app.register(cors, {
    origin: [env.corsOrigin, 'http://127.0.0.1:5173'],
    credentials: true,
  })

  await app.register(jwt, {
    secret: env.jwtSecret,
    sign: { expiresIn: env.jwtExpiresIn },
  })

  registerErrorHandler(app)

  app.get('/health', async () => ({ status: 'ok', env: env.nodeEnv }))

  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' })
      await api.register(catalogRoutes, { prefix: '/catalog' })
      await api.register(dashboardRoutes, { prefix: '/dashboard' })
      await api.register(scheduleRoutes, { prefix: '/schedule' })
      await api.register(workloadRoutes, { prefix: '/workload' })
      await api.register(achievementRoutes, { prefix: '/achievements' })
      await api.register(practiceRoutes, { prefix: '/practices' })
      await api.register(applicationRoutes, { prefix: '/applications' })
      await api.register(noticeRoutes, { prefix: '/notices' })
      await api.register(todoRoutes, { prefix: '/todos' })
    },
    { prefix: '/api' },
  )

  return app
}

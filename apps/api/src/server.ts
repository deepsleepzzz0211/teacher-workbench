import { buildApp } from './app'
import { env } from './config/env'

async function main(): Promise<void> {
  const app = await buildApp()

  try {
    await app.listen({ port: env.port, host: env.host })
    app.log.info(`教师工作台 API 已启动：http://${env.host}:${env.port}`)
    app.log.info(`健康检查：http://${env.host}:${env.port}/health`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`收到 ${signal}，正在关闭服务 ...`)
    await app.close()
    const { pool } = await import('./db/client')
    await pool.end()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((error) => {
  console.error('[api] 启动失败：', error)
  process.exit(1)
})

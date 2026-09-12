import { pool } from './client'
import { migrate, resetSchema } from './migrate'
import { seedDemoData } from './seed'

async function main(): Promise<void> {
  console.log('[reset] 正在重建数据库结构 ...')
  await resetSchema(pool)
  const applied = await migrate(pool)
  console.log(`[reset] 已应用 ${applied.length} 个迁移文件`)

  console.log('[reset] 正在写入演示数据 ...')
  await seedDemoData()
  console.log('[reset] 完成。')
  await pool.end()
}

main().catch(async (error) => {
  console.error('[reset] 失败：', error)
  process.exit(1)
})

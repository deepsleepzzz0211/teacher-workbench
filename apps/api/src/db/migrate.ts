import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Pool } from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
export const MIGRATIONS_DIR = resolve(here, '../../drizzle')

/**
 * 极简迁移器：按文件名顺序执行 drizzle/*.sql，并用 _migrations 表记录已执行文件。
 * 每个文件在独立事务中执行，失败即回滚，避免半套结构。
 *
 * 之所以不用 drizzle-kit 的运行时迁移，是因为原生的 SQL 文件更易审计，
 * 且测试环境需要能反复"清库后重放"。
 */
export async function migrate(pool: Pool): Promise<string[]> {
  await pool.query(
    `create table if not exists _migrations (
       name text primary key,
       applied_at timestamptz not null default now()
     )`,
  )

  let files: string[] = []
  try {
    files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort()
  } catch {
    throw new Error(`找不到迁移目录：${MIGRATIONS_DIR}`)
  }

  const applied: string[] = []
  for (const file of files) {
    const { rowCount } = await pool.query('select 1 from _migrations where name = $1', [file])
    if (rowCount && rowCount > 0) continue

    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('insert into _migrations (name) values ($1)', [file])
      await client.query('commit')
      applied.push(file)
    } catch (error) {
      await client.query('rollback')
      throw new Error(`迁移 ${file} 执行失败：${(error as Error).message}`)
    } finally {
      client.release()
    }
  }

  return applied
}

/** 彻底重建 public schema —— 仅用于测试与本地重置 */
export async function resetSchema(pool: Pool): Promise<void> {
  await pool.query('drop schema if exists public cascade')
  await pool.query('create schema public')
}

async function runCli(): Promise<void> {
  const { pool } = await import('./client')
  const applied = await migrate(pool)
  if (applied.length === 0) {
    console.log('[migrate] 数据库结构已是最新，无需迁移。')
  } else {
    console.log(`[migrate] 已应用 ${applied.length} 个迁移文件：`)
    for (const file of applied) console.log(`  - ${file}`)
  }
  await pool.end()
}

const entry = process.argv[1] ? basename(process.argv[1]) : ''
if (entry === 'migrate.ts' || entry === 'migrate.js' || entry === 'migrate.mts') {
  runCli().catch((error) => {
    console.error('[migrate] 失败：', error)
    process.exit(1)
  })
}

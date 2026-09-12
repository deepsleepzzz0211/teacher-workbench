import { and, desc, eq } from 'drizzle-orm'

import { MAX_WEEKS, TERM_REQUIRED_HOURS, type Term } from '@tw/shared'

import { db } from '../db/client'
import { terms } from '../db/schema'
import { badRequest, notFound } from '../utils/http'

/** 取当前学期；若库中没有标记 current 的学期，则取最近开始的一个 */
export async function getCurrentTerm(): Promise<Term> {
  const [current] = await db.select().from(terms).where(eq(terms.isCurrent, true)).limit(1)
  const fallback = current
    ? undefined
    : (await db.select().from(terms).orderBy(desc(terms.startDate)).limit(1))[0]

  const term = current ?? fallback
  if (!term) throw notFound('系统中还没有任何学期数据，请先执行 pnpm db:seed')

  return toTerm(term)
}

/** 解析 termId；未传则回退到当前学期 */
export async function resolveTerm(termId?: string): Promise<Term> {
  if (!termId) return getCurrentTerm()
  const [term] = await db.select().from(terms).where(eq(terms.id, termId)).limit(1)
  if (!term) throw notFound('学期不存在')
  return toTerm(term)
}

function toTerm(row: typeof terms.$inferSelect): Term {
  return {
    id: row.id,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    isCurrent: row.isCurrent,
  }
}

/** 学期基本工作量，目前为全局常量，未来可作为学期属性下发 */
export function requiredHoursOf(_term: Term): number {
  return TERM_REQUIRED_HOURS
}

/** 计算给定日期属于学期第几教学周（1 起，超出范围则截断到 1..MAX_WEEKS） */
export function weekOfTerm(term: Term, date: Date = new Date()): number {
  const start = Date.parse(`${term.startDate}T00:00:00+08:00`)
  const now = date.getTime()
  if (!Number.isFinite(start) || now < start) return 1
  const week = Math.floor((now - start) / (7 * 86_400_000)) + 1
  return Math.min(Math.max(week, 1), MAX_WEEKS)
}

/** 把 Date 转成 YYYY-MM-DD（按本地时区） */
export function toDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** ISO 星期：1=周一 ... 7=周日 */
export function isoWeekday(date: Date = new Date()): number {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

/** 取教学日（周一至周五）中，从某个星期一算起第 offset 天的日期字符串 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setDate(next.getDate() + days)
  return next
}

/** 校验某条记录属于当前教师，否则 404，避免越权读写 */
export async function assertOwned(
  // 传入已查到的记录（含 teacherId）与当前用户
  found: { teacherId: string } | undefined,
  userId: string,
  entityName: string,
): Promise<void> {
  if (!found) throw notFound(`${entityName}不存在`)
  if (found.teacherId !== userId) throw notFound(`${entityName}不存在`)
}

export function matchesWeekParity(parity: string, week: number): boolean {
  if (parity === 'odd') return week % 2 === 1
  if (parity === 'even') return week % 2 === 0
  return true
}

export { and, eq }
export { badRequest }

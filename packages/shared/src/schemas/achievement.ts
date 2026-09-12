import { z } from 'zod'

import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LEVELS,
  type AchievementCategory,
  type AchievementLevel,
} from '../constants'
import { dateString, inclusiveDays, uuidSchema } from './common'

/* ------------------------------- 教科研成果 ------------------------------- */

export const achievementBaseSchema = z.object({
  category: z.enum(ACHIEVEMENT_CATEGORIES),
  title: z.string().trim().min(2, '请填写成果名称').max(200),
  level: z.enum(ACHIEVEMENT_LEVELS),
  /** 本人角色，如：主持人 / 第一作者 / 参与人 */
  role: z.string().trim().min(1, '请填写本人角色').max(60),
  achievedOn: dateString,
  /** 自评分值，留空则由级别自动折算 */
  score: z.coerce.number().min(0).max(500).optional(),
  description: z.string().trim().max(1000).default(''),
})

export const achievementCreateSchema = achievementBaseSchema
export type AchievementCreateInput = z.infer<typeof achievementCreateSchema>

export const achievementUpdateSchema = achievementBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: '至少需要提供一个待更新字段' })
export type AchievementUpdateInput = z.infer<typeof achievementUpdateSchema>

export const achievementQuerySchema = z.object({
  category: z.enum(ACHIEVEMENT_CATEGORIES).optional(),
  level: z.enum(ACHIEVEMENT_LEVELS).optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
export type AchievementQuery = z.infer<typeof achievementQuerySchema>

export interface Achievement {
  id: string
  teacherId: string
  category: AchievementCategory
  title: string
  level: AchievementLevel
  role: string
  achievedOn: string
  score: number
  description: string
  createdAt: string
}

export interface AchievementStats {
  total: number
  scoreSum: number
  byCategory: Record<AchievementCategory, number>
  byLevel: Record<AchievementLevel, number>
}

/* --------------------------- 企业实践（双师型） --------------------------- */

export const practiceBaseSchema = z.object({
  company: z.string().trim().min(2, '请填写企业名称').max(120),
  position: z.string().trim().min(1, '请填写实践岗位').max(60),
  startDate: dateString,
  endDate: dateString,
  /** 留空则按起止日期（含首尾）自动计算 */
  days: z.coerce.number().int().min(1).max(1000).optional(),
  description: z.string().trim().max(1000).default(''),
})

export const practiceCreateSchema = practiceBaseSchema.refine(
  (value) => value.endDate >= value.startDate,
  { message: '结束日期不能早于开始日期', path: ['endDate'] },
)
export type PracticeCreateInput = z.infer<typeof practiceCreateSchema>

/** 实践天数：优先取显式填写值，否则按起止日期含首尾计算 */
export function resolvePracticeDays(input: { startDate: string; endDate: string; days?: number }): number {
  if (input.days !== undefined && Number.isFinite(input.days) && input.days > 0) return input.days
  return inclusiveDays(input.startDate, input.endDate)
}

export interface EnterprisePractice {
  id: string
  teacherId: string
  company: string
  position: string
  startDate: string
  endDate: string
  days: number
  description: string
  createdAt: string
}

export interface PracticeProgress {
  /** 近 5 年累计实践天数 */
  accumulatedDays: number
  /** 政策要求天数 */
  requiredDays: number
  /** 达成率（保留 3 位小数，可大于 1） */
  rate: number
  /** 还差多少天，已达标为 0 */
  remainingDays: number
  records: EnterprisePractice[]
}

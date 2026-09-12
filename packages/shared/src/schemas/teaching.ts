import { z } from 'zod'

import {
  type CourseType,
  MAX_WEEKS,
  WEEK_PARITIES,
  type WeekParity,
  WORKLOAD_ITEM_CATEGORIES,
  type WorkloadItemCategory,
} from '../constants'
import { dateString, uuidSchema } from './common'

/* ---------------------------------- 学期 ---------------------------------- */

export interface Term {
  id: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

/* ------------------------------- 课程与班级 ------------------------------- */

export interface Course {
  id: string
  code: string
  name: string
  courseType: CourseType
  credits: number
  hours: number
}

export interface ClassGroup {
  id: string
  name: string
  major: string
  grade: number
  studentCount: number
}

/* -------------------------------- 授课任务 -------------------------------- */

export const teachingTaskBaseSchema = z.object({
  termId: uuidSchema,
  courseId: uuidSchema,
  classId: uuidSchema,
  /** 上课地点 */
  location: z.string().trim().max(60).default(''),
  /** 1=周一 ... 7=周日 */
  weekday: z.coerce.number().int().min(1).max(7),
  /** 节次，1 起 */
  startSection: z.coerce.number().int().min(1).max(12),
  endSection: z.coerce.number().int().min(1).max(12),
  weekStart: z.coerce.number().int().min(1).max(MAX_WEEKS),
  weekEnd: z.coerce.number().int().min(1).max(MAX_WEEKS),
  weekParity: z.enum(WEEK_PARITIES).default('all'),
  /** 课程总学时 */
  totalHours: z.coerce.number().positive('总学时必须大于 0').max(2000),
  /** 班级人数（默认取自班级档案，可覆盖） */
  studentCount: z.coerce.number().int().min(1).max(300),
  /** 同一学期同一课程第几次授课，用于重复课系数 */
  repeatIndex: z.coerce.number().int().min(1).max(20).default(1),
  remark: z.string().trim().max(200).default(''),
})

const sectionOrderRefine = <T extends { startSection: number; endSection: number }>(value: T) =>
  value.endSection >= value.startSection
const sectionOrderMessage = { message: '结束节次不能早于开始节次', path: ['endSection'] }

const weekOrderRefine = <T extends { weekStart: number; weekEnd: number }>(value: T) =>
  value.weekEnd >= value.weekStart
const weekOrderMessage = { message: '结束周次不能早于开始周次', path: ['weekEnd'] }

export const teachingTaskCreateSchema = teachingTaskBaseSchema
  .refine(sectionOrderRefine, sectionOrderMessage)
  .refine(weekOrderRefine, weekOrderMessage)
export type TeachingTaskCreateInput = z.infer<typeof teachingTaskCreateSchema>

export const teachingTaskUpdateSchema = teachingTaskBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: '至少需要提供一个待更新字段' })
export type TeachingTaskUpdateInput = z.infer<typeof teachingTaskUpdateSchema>

export interface TeachingTask {
  id: string
  teacherId: string
  termId: string
  courseId: string
  classId: string
  courseName: string
  courseCode: string
  courseType: CourseType
  className: string
  location: string
  weekday: number
  startSection: number
  endSection: number
  weekStart: number
  weekEnd: number
  weekParity: WeekParity
  totalHours: number
  studentCount: number
  repeatIndex: number
  remark: string
  /** 折算学时（由领域函数算出，随响应返回便于核对） */
  effectiveHours: number
  createdAt: string
}

/* ------------------------------ 其它工作量 ------------------------------ */

export const workloadItemBaseSchema = z.object({
  termId: uuidSchema,
  category: z.enum(WORKLOAD_ITEM_CATEGORIES),
  title: z.string().trim().min(1, '请填写工作内容').max(120),
  quantity: z.coerce.number().positive('数量必须大于 0').max(10_000),
  occurredOn: dateString,
  remark: z.string().trim().max(200).default(''),
})

export const workloadItemCreateSchema = workloadItemBaseSchema
export type WorkloadItemCreateInput = z.infer<typeof workloadItemCreateSchema>

export interface WorkloadItem {
  id: string
  teacherId: string
  termId: string
  category: WorkloadItemCategory
  title: string
  quantity: number
  occurredOn: string
  remark: string
  /** 折算学时 */
  hours: number
  createdAt: string
}

/* -------------------------------- 汇总视图 -------------------------------- */

export interface WorkloadSummaryView {
  termId: string
  termName: string
  taskHours: number
  itemHours: number
  totalHours: number
  requiredHours: number
  achievementRate: number
  byCourseType: Record<CourseType, number>
  byItemCategory: Record<WorkloadItemCategory, number>
  weekly: { week: number; hours: number }[]
  taskCount: number
  itemCount: number
}

/* --------------------------------- 课表 --------------------------------- */

export interface ScheduleEntry {
  taskId: string
  courseName: string
  courseType: CourseType
  className: string
  location: string
  weekday: number
  startSection: number
  endSection: number
  weekStart: number
  weekEnd: number
  weekParity: WeekParity
}

export const scheduleQuerySchema = z.object({
  termId: uuidSchema.optional(),
  week: z.coerce.number().int().min(1).max(MAX_WEEKS).optional(),
})
export type ScheduleQuery = z.infer<typeof scheduleQuerySchema>

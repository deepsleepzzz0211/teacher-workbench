import { z } from 'zod'

import {
  APPLICATION_STATUSES,
  APPLICATION_TYPES,
  type ApplicationStatus,
  type ApplicationType,
  NOTICE_CATEGORIES,
  type NoticeCategory,
  TODO_PRIORITIES,
  TODO_STATUSES,
  type TodoPriority,
  type TodoStatus,
} from '../constants'
import { dateString, uuidSchema } from './common'

/* ------------------------------ 调课 / 请假 ------------------------------ */

export const applicationCreateSchema = z.object({
  type: z.enum(APPLICATION_TYPES),
  /** 关联的授课任务（调课时必填） */
  taskId: uuidSchema.optional(),
  /** 原上课日期 */
  originalDate: dateString,
  originalSection: z.string().trim().max(40).default(''),
  /** 调课后的日期与节次 */
  targetDate: dateString.optional(),
  targetSection: z.string().trim().max(40).default(''),
  reason: z.string().trim().min(5, '请至少填写 5 个字的事由').max(500),
})
export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>

export const applicationReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().trim().max(300).default(''),
})
export type ApplicationReviewInput = z.infer<typeof applicationReviewSchema>

export const applicationQuerySchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  mine: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
export type ApplicationQuery = z.infer<typeof applicationQuerySchema>

export interface ApplicationRecord {
  id: string
  teacherId: string
  teacherName: string
  type: ApplicationType
  taskId: string | null
  courseName: string | null
  className: string | null
  originalDate: string
  originalSection: string
  targetDate: string | null
  targetSection: string
  reason: string
  status: ApplicationStatus
  reviewerId: string | null
  reviewerName: string | null
  reviewComment: string | null
  reviewedAt: string | null
  createdAt: string
}

/* -------------------------------- 通知公告 -------------------------------- */

export const noticeCreateSchema = z.object({
  title: z.string().trim().min(2, '请填写标题').max(200),
  content: z.string().trim().min(2, '请填写正文').max(5000),
  category: z.enum(NOTICE_CATEGORIES),
  isTop: z.coerce.boolean().default(false),
})
export type NoticeCreateInput = z.infer<typeof noticeCreateSchema>

export interface Notice {
  id: string
  title: string
  content: string
  category: NoticeCategory
  isTop: boolean
  publisherId: string | null
  publisherName: string
  publishedAt: string
  /** 当前用户是否已读 */
  isRead: boolean
}

export interface NoticeListResult {
  items: Notice[]
  total: number
  page: number
  pageSize: number
  unreadCount: number
}

/* --------------------------------- 待办 --------------------------------- */

export const todoCreateSchema = z.object({
  title: z.string().trim().min(1, '请填写待办内容').max(200),
  dueDate: dateString,
  priority: z.enum(TODO_PRIORITIES).default('medium'),
  relatedType: z.string().trim().max(40).default(''),
})
export type TodoCreateInput = z.infer<typeof todoCreateSchema>

export const todoUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    dueDate: dateString.optional(),
    priority: z.enum(TODO_PRIORITIES).optional(),
    status: z.enum(TODO_STATUSES).optional(),
    relatedType: z.string().trim().max(40).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: '至少需要提供一个待更新字段' })
export type TodoUpdateInput = z.infer<typeof todoUpdateSchema>

export interface Todo {
  id: string
  teacherId: string
  title: string
  dueDate: string
  priority: TodoPriority
  status: TodoStatus
  relatedType: string
  createdAt: string
  completedAt: string | null
}

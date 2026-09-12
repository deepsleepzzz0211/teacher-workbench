import type { Dayjs } from 'dayjs'

import type { CourseType, WorkloadItemCategory } from '@tw/shared'

export interface TaskFormValues {
  termId: string
  courseId: string
  classId: string
  location?: string
  weekday: number
  startSection: number
  endSection: number
  weekStart: number
  weekEnd: number
  weekParity: 'all' | 'odd' | 'even'
  totalHours: number
  studentCount: number
  repeatIndex: number
  remark?: string
}

export interface ItemFormValues {
  termId: string
  category: WorkloadItemCategory
  title: string
  quantity: number
  occurredOn: Dayjs
  remark?: string
}

export interface TaskPreview {
  totalHours: number
  courseType: CourseType
  studentCount: number
  repeatIndex: number
}

export const EMPTY_TASK_PREVIEW: TaskPreview = {
  totalHours: 0,
  courseType: 'theory',
  studentCount: 0,
  repeatIndex: 1,
}

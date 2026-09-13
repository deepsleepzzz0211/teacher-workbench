import type { Dayjs } from 'dayjs'

import type { ApplicationType } from '@tw/shared'

export interface ApplicationFormValues {
  type: ApplicationType
  taskId?: string
  originalDate: Dayjs
  originalSection?: string
  targetDate?: Dayjs
  targetSection?: string
  reason: string
}

export const STATUS_FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
]

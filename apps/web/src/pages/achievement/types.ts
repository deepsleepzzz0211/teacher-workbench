import type { Dayjs } from 'dayjs'

import type { AchievementCategory, AchievementLevel } from '@tw/shared'

export interface AchievementFormValues {
  category: AchievementCategory
  title: string
  level: AchievementLevel
  role: string
  achievedOn: Dayjs
  score?: number
  description?: string
}

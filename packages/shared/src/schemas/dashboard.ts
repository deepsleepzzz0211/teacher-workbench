import type { AchievementCategory } from '../constants'
import type { Achievement } from './achievement'
import type { PracticeProgress } from './achievement'
import type { ScheduleEntry, WorkloadSummaryView } from './teaching'
import type { Notice, Todo } from './workflow'

export interface TodayCourse {
  taskId: string
  courseName: string
  className: string
  location: string
  startSection: number
  endSection: number
}

export interface DashboardOverview {
  teacher: {
    name: string
    department: string
    title: string
    role: string
  }
  today: {
    date: string
    weekday: number
    isTeachingDay: boolean
    courses: TodayCourse[]
    hours: number
    showingFrom: string | null
  }
  currentTerm: {
    id: string
    name: string
    week: number
  } | null
  workload: WorkloadSummaryView | null
  /** 未完成的待办，按截止日期升序，最多 8 条 */
  todos: Todo[]
  /** 最新通知，最多 5 条 */
  notices: Notice[]
  achievement: {
    total: number
    scoreSum: number
    byCategory: Record<AchievementCategory, number>
    /** 最近登记的成果，最多 5 条 */
    recent: Achievement[]
  }
  practice: PracticeProgress
  /** 本周课表（用于首页迷你课表） */
  weekSchedule: ScheduleEntry[]
  counters: {
    pendingTodos: number
    unreadNotices: number
    pendingApplications: number
  }
}

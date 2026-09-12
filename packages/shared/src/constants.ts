/**
 * 全局业务常量 —— 前后端共用的唯一事实来源。
 *
 * 这里的折算规则来自高职院校教师教学工作量的通行口径：
 * 理论课、理实一体课、实训课、顶岗实习指导在备课与器材/巡回指导上的投入不同，
 * 因此折算系数依次递增；同时考虑班级规模与重复授课的边际成本。
 */

export const COURSE_TYPES = ['theory', 'integrated', 'practice', 'internship'] as const
export type CourseType = (typeof COURSE_TYPES)[number]

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  theory: '理论课',
  integrated: '理实一体课',
  practice: '实训课',
  internship: '顶岗实习',
}

export const COURSE_TYPE_COEFFICIENTS: Record<CourseType, number> = {
  theory: 1.0,
  integrated: 1.1,
  practice: 1.2,
  internship: 1.5,
}

/** 班级人数超过该阈值后，每增加 1 人增加 1% 折算系数 */
export const CLASS_SIZE_THRESHOLD = 40
/** 班级规模系数上限 */
export const CLASS_SIZE_MAX_FACTOR = 1.3
/** 班级规模系数每超 1 人的增量 */
export const CLASS_SIZE_STEP = 0.01

/** 同一学期同一课程第 2 次及以后授课的折算系数 */
export const REPEAT_COURSE_FACTOR = 0.9

/** 专任教师每学期基本工作量（折算学时） */
export const TERM_REQUIRED_HOURS = 240

/** 政策要求：教师每 5 年赴企业集中实践累计月数（6 个月）对应的天数 */
export const PRACTICE_REQUIRED_DAYS = 180
/** 企业实践考核窗口（年） */
export const PRACTICE_WINDOW_YEARS = 5

/** 学生规模达到该人数时视为"合班"教学 */
export const MERGED_CLASS_THRESHOLD = 60

/** 一学期最大周次 */
export const MAX_WEEKS = 20

export const WEEK_PARITIES = ['all', 'odd', 'even'] as const
export type WeekParity = (typeof WEEK_PARITIES)[number]

export const WEEK_PARITY_LABELS: Record<WeekParity, string> = {
  all: '每周',
  odd: '单周',
  even: '双周',
}

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const

export const WORKLOAD_ITEM_CATEGORIES = [
  'internship_guide',
  'thesis_guide',
  'competition_guide',
  'social_training',
  'teaching_research',
  'other',
] as const
export type WorkloadItemCategory = (typeof WORKLOAD_ITEM_CATEGORIES)[number]

export interface WorkloadItemRule {
  label: string
  unit: string
  hoursPerUnit: number
}

/** 课堂教学之外的其它工作量折算规则 */
export const WORKLOAD_ITEM_RULES: Record<WorkloadItemCategory, WorkloadItemRule> = {
  internship_guide: { label: '顶岗实习指导', unit: '人·周', hoursPerUnit: 1.0 },
  thesis_guide: { label: '毕业设计指导', unit: '人', hoursPerUnit: 4.0 },
  competition_guide: { label: '技能竞赛指导', unit: '项', hoursPerUnit: 20.0 },
  social_training: { label: '社会培训', unit: '学时', hoursPerUnit: 1.2 },
  teaching_research: { label: '教研活动', unit: '次', hoursPerUnit: 2.0 },
  other: { label: '其他工作', unit: '折算学时', hoursPerUnit: 1.0 },
}

export const ACHIEVEMENT_CATEGORIES = [
  'paper',
  'project',
  'competition',
  'patent',
  'textbook',
  'training',
] as const
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number]

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  paper: '教科研论文',
  project: '教科研课题',
  competition: '竞赛获奖',
  patent: '专利 / 软著',
  textbook: '教材 / 著作',
  training: '培训进修',
}

export const ACHIEVEMENT_LEVELS = ['national', 'provincial', 'municipal', 'school'] as const
export type AchievementLevel = (typeof ACHIEVEMENT_LEVELS)[number]

export const ACHIEVEMENT_LEVEL_LABELS: Record<AchievementLevel, string> = {
  national: '国家级',
  provincial: '省级',
  municipal: '市厅级',
  school: '校级',
}

/** 各级别对应的成果分值（用于绩效考核参考汇总） */
export const ACHIEVEMENT_LEVEL_POINTS: Record<AchievementLevel, number> = {
  national: 30,
  provincial: 15,
  municipal: 8,
  school: 3,
}

export const APPLICATION_TYPES = ['adjust_class', 'leave'] as const
export type ApplicationType = (typeof APPLICATION_TYPES)[number]

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  adjust_class: '调课申请',
  leave: '请假申请',
}

export const APPLICATION_STATUSES = ['pending', 'approved', 'rejected'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
}

export const TODO_PRIORITIES = ['high', 'medium', 'low'] as const
export type TodoPriority = (typeof TODO_PRIORITIES)[number]

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export const TODO_STATUSES = ['pending', 'done'] as const
export type TodoStatus = (typeof TODO_STATUSES)[number]

export const NOTICE_CATEGORIES = ['academic', 'research', 'hr', 'general'] as const
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number]

export const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
  academic: '教务',
  research: '科研',
  hr: '人事',
  general: '综合',
}

export const ROLES = ['teacher', 'dept_admin'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  teacher: '专任教师',
  dept_admin: '院系管理员',
}

export const DASHBOARD_NOTICE_LIMIT = 5

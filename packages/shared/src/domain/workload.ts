/**
 * 教学工作量折算 —— 纯函数，无任何 I/O 依赖。
 *
 * 这是本项目的核心业务规则，被后端聚合与前端实时预览共同使用，
 * 因此放在 shared 包中保持"同一套规则、同一份实现"。
 *
 *   折算学时 = 总学时 × 课程类型系数 × 班级规模系数 × 重复课系数
 */

import {
  ACHIEVEMENT_LEVEL_POINTS,
  type AchievementLevel,
  CLASS_SIZE_MAX_FACTOR,
  CLASS_SIZE_STEP,
  CLASS_SIZE_THRESHOLD,
  COURSE_TYPE_COEFFICIENTS,
  COURSE_TYPES,
  type CourseType,
  MAX_WEEKS,
  REPEAT_COURSE_FACTOR,
  TERM_REQUIRED_HOURS,
  type WeekParity,
  WORKLOAD_ITEM_CATEGORIES,
  WORKLOAD_ITEM_RULES,
  type WorkloadItemCategory,
} from '../constants'

/** 四舍五入到 1 位小数，消除浮点噪声 */
export function round1(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10) / 10
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/**
 * 班级规模系数。
 * ≤ 40 人 → 1.0；> 40 人 → 1 + (人数 - 40) × 0.01，上限 1.3。
 */
export function calcClassSizeFactor(studentCount: number): number {
  if (!Number.isFinite(studentCount) || studentCount <= CLASS_SIZE_THRESHOLD) return 1
  const raw = 1 + (studentCount - CLASS_SIZE_THRESHOLD) * CLASS_SIZE_STEP
  return Math.min(CLASS_SIZE_MAX_FACTOR, Math.round(raw * 100) / 100)
}

/**
 * 重复课系数。
 * 同一学期同一教师同一课程：第 1 次为 1.0，第 2 次及以后为 0.9。
 */
export function calcRepeatFactor(repeatIndex?: number): number {
  if (repeatIndex === undefined || !Number.isFinite(repeatIndex) || repeatIndex <= 1) return 1
  return REPEAT_COURSE_FACTOR
}

/** 课程类型系数；未知类型按理论课处理，保证历史数据不会让接口崩溃 */
export function calcTypeCoefficient(courseType: CourseType | string): number {
  return COURSE_TYPE_COEFFICIENTS[courseType as CourseType] ?? COURSE_TYPE_COEFFICIENTS.theory
}

export interface TaskCalculationInput {
  /** 课程总学时 */
  totalHours: number
  courseType: CourseType | string
  /** 班级人数 */
  studentCount: number
  /** 同一学期同一课程的第几次授课，默认 1 */
  repeatIndex?: number
}

export interface TaskCalculationDetail {
  totalHours: number
  typeCoefficient: number
  classSizeFactor: number
  repeatFactor: number
  effectiveHours: number
}

/**
 * 计算授课任务的折算学时，并返回每一步的系数，便于界面"自证"给教师看。
 */
export function explainTaskCalculation(input: TaskCalculationInput): TaskCalculationDetail {
  const typeCoefficient = calcTypeCoefficient(input.courseType)
  const classSizeFactor = calcClassSizeFactor(input.studentCount)
  const repeatFactor = calcRepeatFactor(input.repeatIndex)
  const effectiveHours = !isPositiveFinite(input.totalHours)
    ? 0
    : round1(input.totalHours * typeCoefficient * classSizeFactor * repeatFactor)

  return {
    totalHours: Number.isFinite(input.totalHours) ? input.totalHours : 0,
    typeCoefficient,
    classSizeFactor,
    repeatFactor,
    effectiveHours,
  }
}

/** 授课任务折算学时 */
export function calcTaskEffectiveHours(input: TaskCalculationInput): number {
  return explainTaskCalculation(input).effectiveHours
}

export interface ItemCalculationInput {
  category: WorkloadItemCategory | string
  /** 数量，单位由规则表定义 */
  quantity: number
}

/** 教学外其它工作量的折算学时 */
export function calcItemHours(input: ItemCalculationInput): number {
  if (!isPositiveFinite(input.quantity)) return 0
  const rule = WORKLOAD_ITEM_RULES[input.category as WorkloadItemCategory]
  const hoursPerUnit = rule?.hoursPerUnit ?? 1
  return round1(input.quantity * hoursPerUnit)
}

export interface WorkloadSummaryInput {
  tasks: { courseType: CourseType | string; effectiveHours: number }[]
  items: { category: WorkloadItemCategory | string; hours: number }[]
  /** 学期基本工作量，默认 240 折算学时 */
  requiredHours?: number
}

export interface WorkloadSummary {
  /** 课堂教学折算学时合计 */
  taskHours: number
  /** 其它工作量折算学时合计 */
  itemHours: number
  /** 总折算学时 */
  totalHours: number
  /** 学期基本工作量要求 */
  requiredHours: number
  /** 达成率，保留 3 位小数；可大于 1 */
  achievementRate: number
  byCourseType: Record<CourseType, number>
  byItemCategory: Record<WorkloadItemCategory, number>
}

function emptyByCourseType(): Record<CourseType, number> {
  return COURSE_TYPES.reduce(
    (acc, type) => {
      acc[type] = 0
      return acc
    },
    {} as Record<CourseType, number>,
  )
}

function emptyByItemCategory(): Record<WorkloadItemCategory, number> {
  return WORKLOAD_ITEM_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = 0
      return acc
    },
    {} as Record<WorkloadItemCategory, number>,
  )
}

/**
 * 学期工作量汇总：分类合计、总量、达成率与构成。
 */
export function summarizeWorkload(input: WorkloadSummaryInput): WorkloadSummary {
  const byCourseType = emptyByCourseType()
  const byItemCategory = emptyByItemCategory()

  let taskHours = 0
  for (const task of input.tasks) {
    const hours = Number.isFinite(task.effectiveHours) ? task.effectiveHours : 0
    taskHours += hours
    const key = (COURSE_TYPES as readonly string[]).includes(task.courseType)
      ? (task.courseType as CourseType)
      : 'theory'
    byCourseType[key] += hours
  }

  let itemHours = 0
  for (const item of input.items) {
    const hours = Number.isFinite(item.hours) ? item.hours : 0
    itemHours += hours
    const key = (WORKLOAD_ITEM_CATEGORIES as readonly string[]).includes(item.category)
      ? (item.category as WorkloadItemCategory)
      : 'other'
    byItemCategory[key] += hours
  }

  for (const type of COURSE_TYPES) byCourseType[type] = round1(byCourseType[type])
  for (const category of WORKLOAD_ITEM_CATEGORIES) byItemCategory[category] = round1(byItemCategory[category])

  taskHours = round1(taskHours)
  itemHours = round1(itemHours)
  const totalHours = round1(taskHours + itemHours)
  const requiredHours = input.requiredHours ?? TERM_REQUIRED_HOURS
  const achievementRate =
    isPositiveFinite(requiredHours) && totalHours > 0
      ? Math.round((totalHours / requiredHours) * 1000) / 1000
      : 0

  return {
    taskHours,
    itemHours,
    totalHours,
    requiredHours,
    achievementRate,
    byCourseType,
    byItemCategory,
  }
}

/**
 * 统计 [start, end] 闭区间内符合单双周规则的周数。
 * 起点晚于终点、起点小于 1、或非有限数时返回 0。
 */
export function countWeeks(start: number, end: number, parity: WeekParity): number {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  if (start < 1 || end < start) return 0

  let count = 0
  for (let week = Math.floor(start); week <= Math.floor(end); week += 1) {
    if (parity === 'odd' && week % 2 === 0) continue
    if (parity === 'even' && week % 2 !== 0) continue
    count += 1
  }
  return count
}

export interface DistributeTaskInput {
  totalHours: number
  weekStart: number
  weekEnd: number
  weekParity: WeekParity
}

export interface WeekDistribution {
  week: number
  hours: number
}

/**
 * 把各授课任务的总学时按有效教学周均摊，得到每周学时分布。
 * 用于工作量趋势图与课表密度提示。
 */
export function distributeByWeek(
  tasks: DistributeTaskInput[],
  maxWeek: number = MAX_WEEKS,
): WeekDistribution[] {
  const total = Math.max(0, Math.floor(maxWeek))
  const buckets: number[] = Array.from({ length: total }, () => 0)

  for (const task of tasks) {
    const weeks = countWeeks(task.weekStart, task.weekEnd, task.weekParity)
    if (weeks <= 0 || !isPositiveFinite(task.totalHours)) continue

    const hoursPerWeek = task.totalHours / weeks
    for (let week = Math.floor(task.weekStart); week <= Math.floor(task.weekEnd); week += 1) {
      if (week < 1 || week > total) continue
      if (task.weekParity === 'odd' && week % 2 === 0) continue
      if (task.weekParity === 'even' && week % 2 !== 0) continue
      buckets[week - 1] = (buckets[week - 1] ?? 0) + hoursPerWeek
    }
  }

  return buckets.map((hours, index) => ({ week: index + 1, hours: round1(hours) }))
}

/** 成果级别对应的分值；未知级别按校级处理 */
export function calcAchievementPoints(level: AchievementLevel | string, count = 1): number {
  const points = ACHIEVEMENT_LEVEL_POINTS[level as AchievementLevel] ?? ACHIEVEMENT_LEVEL_POINTS.school
  if (!isPositiveFinite(count)) return 0
  return round1(points * count)
}

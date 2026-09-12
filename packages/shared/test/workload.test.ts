import { describe, expect, it } from 'vitest'

import {
  CLASS_SIZE_MAX_FACTOR,
  type CourseType,
  REPEAT_COURSE_FACTOR,
  TERM_REQUIRED_HOURS,
  WORKLOAD_ITEM_RULES,
  type WorkloadItemCategory,
} from '../src/constants'
import {
  calcClassSizeFactor,
  calcItemHours,
  calcRepeatFactor,
  calcTaskEffectiveHours,
  countWeeks,
  distributeByWeek,
  explainTaskCalculation,
  summarizeWorkload,
} from '../src/domain/workload'

describe('calcClassSizeFactor —— 班级规模系数', () => {
  it('40 人及以下不额外加成', () => {
    expect(calcClassSizeFactor(1)).toBe(1)
    expect(calcClassSizeFactor(30)).toBe(1)
    expect(calcClassSizeFactor(40)).toBe(1)
  })

  it('超过 40 人后每增加 1 人增加 0.01', () => {
    expect(calcClassSizeFactor(41)).toBe(1.01)
    expect(calcClassSizeFactor(45)).toBe(1.05)
  })

  it('70 人达到上限 1.3', () => {
    expect(calcClassSizeFactor(70)).toBe(CLASS_SIZE_MAX_FACTOR)
  })

  it('超过 70 人后被上限截断', () => {
    expect(calcClassSizeFactor(120)).toBe(CLASS_SIZE_MAX_FACTOR)
  })

  it('浮点误差被修正（45 人应为精确的 1.05）', () => {
    // 1 + 5 * 0.01 在浮点下可能是 1.0500000000000003
    expect(calcClassSizeFactor(45)).toBe(1.05)
    expect(calcClassSizeFactor(51)).toBe(1.11)
  })

  it('人数非法时回退为 1，不抛异常', () => {
    expect(calcClassSizeFactor(0)).toBe(1)
    expect(calcClassSizeFactor(-10)).toBe(1)
    expect(calcClassSizeFactor(Number.NaN)).toBe(1)
  })
})

describe('calcRepeatFactor —— 重复课系数', () => {
  it('第 1 次授课系数为 1', () => {
    expect(calcRepeatFactor(1)).toBe(1)
  })

  it('第 2 次及以后为 0.9', () => {
    expect(calcRepeatFactor(2)).toBe(REPEAT_COURSE_FACTOR)
    expect(calcRepeatFactor(5)).toBe(REPEAT_COURSE_FACTOR)
  })

  it('次序缺失或非法时按第 1 次处理', () => {
    expect(calcRepeatFactor(0)).toBe(1)
    expect(calcRepeatFactor(-3)).toBe(1)
  })
})

describe('calcTaskEffectiveHours —— 授课任务折算学时', () => {
  it('理论课 64 学时 / 40 人 / 首次授课 = 64.0', () => {
    expect(
      calcTaskEffectiveHours({ totalHours: 64, courseType: 'theory', studentCount: 40, repeatIndex: 1 }),
    ).toBe(64)
  })

  it('理实一体课 48 学时 / 40 人 / 首次 = 52.8', () => {
    expect(
      calcTaskEffectiveHours({
        totalHours: 48,
        courseType: 'integrated',
        studentCount: 40,
        repeatIndex: 1,
      }),
    ).toBe(52.8)
  })

  it('实训课 48 学时 / 45 人 / 首次 = 60.5（48 * 1.2 * 1.05）', () => {
    expect(
      calcTaskEffectiveHours({ totalHours: 48, courseType: 'practice', studentCount: 45, repeatIndex: 1 }),
    ).toBe(60.5)
  })

  it('顶岗实习 120 学时 / 40 人 / 首次 = 180.0', () => {
    expect(
      calcTaskEffectiveHours({
        totalHours: 120,
        courseType: 'internship',
        studentCount: 40,
        repeatIndex: 1,
      }),
    ).toBe(180)
  })

  it('重复课时系数叠乘：48 学时 实训 45 人 第 2 次 = 54.4（60.48 * 0.9 四舍五入）', () => {
    expect(
      calcTaskEffectiveHours({ totalHours: 48, courseType: 'practice', studentCount: 45, repeatIndex: 2 }),
    ).toBe(54.4)
  })

  it('班级规模触及上限：100 人 理论 80 学时 = 104.0', () => {
    expect(
      calcTaskEffectiveHours({ totalHours: 80, courseType: 'theory', studentCount: 100, repeatIndex: 1 }),
    ).toBe(104)
  })

  it('结果保留 1 位小数', () => {
    // 30 * 1.1 * 1.03 = 33.99 -> 34.0
    expect(
      calcTaskEffectiveHours({ totalHours: 30, courseType: 'integrated', studentCount: 43, repeatIndex: 1 }),
    ).toBe(34)
  })

  it('未知课程类型按理论课系数回退，不抛异常', () => {
    const result = calcTaskEffectiveHours({
      totalHours: 32,
      courseType: 'unknown' as CourseType,
      studentCount: 30,
      repeatIndex: 1,
    })
    expect(result).toBe(32)
  })

  it('学时非法（负数 / NaN）返回 0', () => {
    expect(
      calcTaskEffectiveHours({ totalHours: -5, courseType: 'theory', studentCount: 30, repeatIndex: 1 }),
    ).toBe(0)
    expect(
      calcTaskEffectiveHours({
        totalHours: Number.NaN,
        courseType: 'theory',
        studentCount: 30,
        repeatIndex: 1,
      }),
    ).toBe(0)
  })

  it('repeatIndex 缺省时按第 1 次计算', () => {
    expect(calcTaskEffectiveHours({ totalHours: 20, courseType: 'theory', studentCount: 30 })).toBe(20)
  })
})

describe('explainTaskCalculation —— 计算过程可自证', () => {
  it('返回各系数与最终结果，供界面展示', () => {
    const detail = explainTaskCalculation({
      totalHours: 48,
      courseType: 'practice',
      studentCount: 45,
      repeatIndex: 2,
    })
    expect(detail.typeCoefficient).toBe(1.2)
    expect(detail.classSizeFactor).toBe(1.05)
    expect(detail.repeatFactor).toBe(0.9)
    expect(detail.effectiveHours).toBe(54.4)
  })
})

describe('calcItemHours —— 其它工作量折算', () => {
  it('顶岗实习指导 20 人周 = 20', () => {
    expect(calcItemHours({ category: 'internship_guide', quantity: 20 })).toBe(20)
  })

  it('技能竞赛指导 1 项 = 20', () => {
    expect(calcItemHours({ category: 'competition_guide', quantity: 1 })).toBe(20)
  })

  it('社会培训 10 学时 = 12', () => {
    expect(calcItemHours({ category: 'social_training', quantity: 10 })).toBe(12)
  })

  it('毕业设计指导 6 人 = 24', () => {
    expect(calcItemHours({ category: 'thesis_guide', quantity: 6 })).toBe(24)
  })

  it('未知类别按 1:1 折算', () => {
    expect(calcItemHours({ category: 'unknown' as WorkloadItemCategory, quantity: 7 })).toBe(7)
  })

  it('数量非法返回 0', () => {
    expect(calcItemHours({ category: 'other', quantity: -3 })).toBe(0)
  })
})

describe('summarizeWorkload —— 学期工作量汇总', () => {
  const tasks = [
    { courseType: 'theory' as CourseType, effectiveHours: 64 },
    { courseType: 'practice' as CourseType, effectiveHours: 60.5 },
    { courseType: 'theory' as CourseType, effectiveHours: 32 },
  ]
  const items = [
    { category: 'competition_guide' as WorkloadItemCategory, hours: 20 },
    { category: 'thesis_guide' as WorkloadItemCategory, hours: 24 },
  ]

  it('分别汇总课堂教学与其它工作量', () => {
    const summary = summarizeWorkload({ tasks, items })
    expect(summary.taskHours).toBe(156.5)
    expect(summary.itemHours).toBe(44)
    expect(summary.totalHours).toBe(200.5)
  })

  it('默认基本工作量为 240 折算学时', () => {
    expect(summarizeWorkload({ tasks, items }).requiredHours).toBe(TERM_REQUIRED_HOURS)
  })

  it('达成率 = 总学时 / 基本工作量，保留 3 位小数', () => {
    const summary = summarizeWorkload({ tasks, items })
    // 200.5 / 240 = 0.83541666... -> 0.835
    expect(summary.achievementRate).toBe(0.835)
  })

  it('达成率可超过 1（超工作量）', () => {
    const summary = summarizeWorkload({ tasks: [{ courseType: 'theory', effectiveHours: 300 }], items: [] })
    expect(summary.achievementRate).toBe(1.25)
  })

  it('基本工作量为 0 时达成率为 0，不产生除零', () => {
    const summary = summarizeWorkload({ tasks, items, requiredHours: 0 })
    expect(summary.achievementRate).toBe(0)
  })

  it('按课程类型给出构成，缺失类型补 0', () => {
    const summary = summarizeWorkload({ tasks, items })
    expect(summary.byCourseType.theory).toBe(96)
    expect(summary.byCourseType.practice).toBe(60.5)
    expect(summary.byCourseType.integrated).toBe(0)
    expect(summary.byCourseType.internship).toBe(0)
  })

  it('按其它工作量类别给出构成', () => {
    const summary = summarizeWorkload({ tasks, items })
    expect(summary.byItemCategory.competition_guide).toBe(20)
    expect(summary.byItemCategory.thesis_guide).toBe(24)
    expect(summary.byItemCategory.social_training).toBe(0)
  })

  it('空数据返回全 0 且结构完整', () => {
    const summary = summarizeWorkload({ tasks: [], items: [] })
    expect(summary.totalHours).toBe(0)
    expect(summary.achievementRate).toBe(0)
    expect(Object.keys(summary.byCourseType)).toHaveLength(4)
  })

  it('汇总结果保留 1 位小数，避免浮点噪声', () => {
    const summary = summarizeWorkload({
      tasks: [
        { courseType: 'theory', effectiveHours: 10.1 },
        { courseType: 'theory', effectiveHours: 20.2 },
      ],
      items: [],
    })
    expect(summary.taskHours).toBe(30.3)
  })
})

describe('countWeeks —— 教学周计数（含单双周）', () => {
  it('全周：1-18 周共 18 周', () => {
    expect(countWeeks(1, 18, 'all')).toBe(18)
  })

  it('单周：1-18 周内的奇数周共 9 周', () => {
    expect(countWeeks(1, 18, 'odd')).toBe(9)
  })

  it('双周：1-18 周内的偶数周共 9 周', () => {
    expect(countWeeks(1, 18, 'even')).toBe(9)
  })

  it('区间起点非 1 时正确计算：5-10 单周 = 3 周（5,7,9）', () => {
    expect(countWeeks(5, 10, 'odd')).toBe(3)
  })

  it('区间起点非 1 时正确计算：6-9 双周 = 2 周（6,8）', () => {
    expect(countWeeks(6, 9, 'even')).toBe(2)
  })

  it('起止非法或倒置返回 0', () => {
    expect(countWeeks(10, 5, 'all')).toBe(0)
    expect(countWeeks(0, 5, 'all')).toBe(0)
  })
})

describe('distributeByWeek —— 周次学时分布', () => {
  it('全周课程把总学时均摊到每一周', () => {
    const result = distributeByWeek(
      [{ totalHours: 36, weekStart: 1, weekEnd: 18, weekParity: 'all' }],
      18,
    )
    expect(result).toHaveLength(18)
    expect(result[0]).toEqual({ week: 1, hours: 2 })
    expect(result[17]).toEqual({ week: 18, hours: 2 })
  })

  it('单双周课程只落在对应周，其它周为 0', () => {
    const result = distributeByWeek(
      [{ totalHours: 18, weekStart: 1, weekEnd: 18, weekParity: 'odd' }],
      18,
    )
    expect(result[0]!.hours).toBe(2)
    expect(result[1]!.hours).toBe(0)
    expect(result[2]!.hours).toBe(2)
  })

  it('多门课程在同一周叠加', () => {
    const result = distributeByWeek(
      [
        { totalHours: 36, weekStart: 1, weekEnd: 18, weekParity: 'all' },
        { totalHours: 18, weekStart: 1, weekEnd: 18, weekParity: 'all' },
      ],
      18,
    )
    expect(result[0]!.hours).toBe(3)
  })

  it('超出 maxWeek 的周次被截断', () => {
    const result = distributeByWeek(
      [{ totalHours: 20, weekStart: 19, weekEnd: 20, weekParity: 'all' }],
      18,
    )
    expect(result).toHaveLength(18)
    expect(result.reduce((sum, item) => sum + item.hours, 0)).toBe(0)
  })

  it('周数为 0 的任务被安全跳过，不产生除零', () => {
    const result = distributeByWeek(
      [{ totalHours: 20, weekStart: 0, weekEnd: 0, weekParity: 'all' }],
      18,
    )
    expect(result.every((item) => item.hours === 0)).toBe(true)
  })

  it('周次列表从 1 连续到 maxWeek', () => {
    const result = distributeByWeek([], 5)
    expect(result.map((item) => item.week)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('WORKLOAD_ITEM_RULES 完整性', () => {
  it('每个类别都有标签、单位与折算系数', () => {
    for (const [key, rule] of Object.entries(WORKLOAD_ITEM_RULES)) {
      expect(rule.label, `${key} 缺少标签`).toBeTruthy()
      expect(rule.unit, `${key} 缺少单位`).toBeTruthy()
      expect(rule.hoursPerUnit, `${key} 折算系数应为正数`).toBeGreaterThan(0)
    }
  })
})

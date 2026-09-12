import { describe, expect, it } from 'vitest'

import { inclusiveDays, paginationQuerySchema } from '../src/schemas/common'
import { loginSchema } from '../src/schemas/auth'
import { teachingTaskCreateSchema } from '../src/schemas/teaching'
import { achievementCreateSchema } from '../src/schemas/achievement'
import { practiceCreateSchema, resolvePracticeDays } from '../src/schemas/achievement'
import { applicationCreateSchema, applicationReviewSchema, todoCreateSchema } from '../src/schemas/workflow'

const uuid = '11111111-1111-4111-8111-111111111111'

describe('inclusiveDays —— 含首尾的天数', () => {
  it('同一天记 1 天', () => {
    expect(inclusiveDays('2026-03-01', '2026-03-01')).toBe(1)
  })

  it('含首尾：3/1 到 3/31 为 31 天', () => {
    expect(inclusiveDays('2026-03-01', '2026-03-31')).toBe(31)
  })

  it('跨月跨年正确', () => {
    expect(inclusiveDays('2025-12-30', '2026-01-02')).toBe(4)
  })

  it('结束早于开始返回 0', () => {
    expect(inclusiveDays('2026-03-10', '2026-03-01')).toBe(0)
  })

  it('非法日期返回 0', () => {
    expect(inclusiveDays('not-a-date', '2026-03-01')).toBe(0)
  })
})

describe('loginSchema', () => {
  it('接受合法登录参数', () => {
    expect(loginSchema.safeParse({ username: 't1001', password: 'x' }).success).toBe(true)
  })

  it('空用户名被拒绝', () => {
    const result = loginSchema.safeParse({ username: '  ', password: 'x' })
    expect(result.success).toBe(false)
  })

  it('空密码被拒绝', () => {
    expect(loginSchema.safeParse({ username: 't1001', password: '' }).success).toBe(false)
  })
})

describe('paginationQuerySchema', () => {
  it('缺省时给出第 1 页、每页 20 条', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 })
  })

  it('把字符串数字转成数字（查询串场景）', () => {
    expect(paginationQuerySchema.parse({ page: '2', pageSize: '50' })).toEqual({ page: 2, pageSize: 50 })
  })

  it('每页超过 100 条被拒绝', () => {
    expect(paginationQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false)
  })

  it('页码小于 1 被拒绝', () => {
    expect(paginationQuerySchema.safeParse({ page: '0' }).success).toBe(false)
  })
})

describe('teachingTaskCreateSchema', () => {
  const valid = {
    termId: uuid,
    courseId: uuid,
    classId: uuid,
    weekday: 1,
    startSection: 1,
    endSection: 2,
    weekStart: 1,
    weekEnd: 18,
    weekParity: 'all',
    totalHours: 64,
    studentCount: 42,
  }

  it('接受合法授课任务并补全默认值', () => {
    const parsed = teachingTaskCreateSchema.parse(valid)
    expect(parsed.repeatIndex).toBe(1)
    expect(parsed.location).toBe('')
    expect(parsed.remark).toBe('')
  })

  it('结束节次早于开始节次被拒绝', () => {
    const result = teachingTaskCreateSchema.safeParse({ ...valid, startSection: 5, endSection: 3 })
    expect(result.success).toBe(false)
  })

  it('结束周次早于开始周次被拒绝', () => {
    const result = teachingTaskCreateSchema.safeParse({ ...valid, weekStart: 10, weekEnd: 4 })
    expect(result.success).toBe(false)
  })

  it('总学时为 0 被拒绝', () => {
    expect(teachingTaskCreateSchema.safeParse({ ...valid, totalHours: 0 }).success).toBe(false)
  })

  it('星期超出 1-7 被拒绝', () => {
    expect(teachingTaskCreateSchema.safeParse({ ...valid, weekday: 8 }).success).toBe(false)
  })

  it('非 UUID 的班级被拒绝', () => {
    expect(teachingTaskCreateSchema.safeParse({ ...valid, classId: 'class-1' }).success).toBe(false)
  })

  it('单双周取值非法被拒绝', () => {
    expect(teachingTaskCreateSchema.safeParse({ ...valid, weekParity: 'biweekly' }).success).toBe(false)
  })

  it('字符串数字被强制转换', () => {
    const parsed = teachingTaskCreateSchema.parse({ ...valid, totalHours: '48', studentCount: '45' })
    expect(parsed.totalHours).toBe(48)
    expect(parsed.studentCount).toBe(45)
  })
})

describe('achievementCreateSchema', () => {
  const valid = {
    category: 'paper',
    title: '高职院校产教融合路径研究',
    level: 'provincial',
    role: '第一作者',
    achievedOn: '2026-04-18',
  }

  it('接受合法成果并补全默认值', () => {
    const parsed = achievementCreateSchema.parse(valid)
    expect(parsed.description).toBe('')
    expect(parsed.score).toBeUndefined()
  })

  it('标题过短被拒绝', () => {
    expect(achievementCreateSchema.safeParse({ ...valid, title: '短' }).success).toBe(false)
  })

  it('非法类别被拒绝', () => {
    expect(achievementCreateSchema.safeParse({ ...valid, category: 'blog' }).success).toBe(false)
  })

  it('日期格式不合法被拒绝', () => {
    expect(achievementCreateSchema.safeParse({ ...valid, achievedOn: '2026/04/18' }).success).toBe(false)
  })
})

describe('practiceCreateSchema 与天数解析', () => {
  const valid = {
    company: '某某智能装备有限公司',
    position: '工艺工程师',
    startDate: '2026-01-05',
    endDate: '2026-03-15',
  }

  it('接受合法实践记录', () => {
    expect(practiceCreateSchema.safeParse(valid).success).toBe(true)
  })

  it('结束日期早于开始日期被拒绝', () => {
    expect(
      practiceCreateSchema.safeParse({ ...valid, startDate: '2026-05-01', endDate: '2026-04-01' }).success,
    ).toBe(false)
  })

  it('未填天数时按日期自动计算', () => {
    expect(resolvePracticeDays({ startDate: '2026-01-05', endDate: '2026-01-09' })).toBe(5)
  })

  it('显式填写天数时以其为准', () => {
    expect(resolvePracticeDays({ startDate: '2026-01-05', endDate: '2026-01-09', days: 3 })).toBe(3)
  })
})

describe('applicationCreateSchema / review', () => {
  const valid = {
    type: 'adjust_class',
    originalDate: '2026-04-20',
    reason: '参加省级技能大赛评审，需要调整上课时间',
  }

  it('接受合法调课申请', () => {
    const parsed = applicationCreateSchema.parse(valid)
    expect(parsed.originalSection).toBe('')
    expect(parsed.targetSection).toBe('')
  })

  it('事由过短被拒绝', () => {
    expect(applicationCreateSchema.safeParse({ ...valid, reason: '有事' }).success).toBe(false)
  })

  it('审批只接受通过或驳回', () => {
    expect(applicationReviewSchema.safeParse({ decision: 'approved' }).success).toBe(true)
    expect(applicationReviewSchema.safeParse({ decision: 'pending' }).success).toBe(false)
  })

  it('审批意见默认空字符串', () => {
    expect(applicationReviewSchema.parse({ decision: 'rejected' }).comment).toBe('')
  })
})

describe('todoCreateSchema', () => {
  it('默认优先级为中', () => {
    expect(todoCreateSchema.parse({ title: '提交教学计划', dueDate: '2026-04-30' }).priority).toBe('medium')
  })

  it('缺少截止日期被拒绝', () => {
    expect(todoCreateSchema.safeParse({ title: '提交教学计划' }).success).toBe(false)
  })

  it('非法优先级被拒绝', () => {
    expect(
      todoCreateSchema.safeParse({ title: 'x', dueDate: '2026-04-30', priority: 'urgent' }).success,
    ).toBe(false)
  })
})

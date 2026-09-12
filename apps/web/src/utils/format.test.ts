import { describe, expect, it } from 'vitest'

import { formatDate, formatHours, formatPercent, sectionRange, weekdayLabel } from './format'

describe('formatHours', () => {
  it('保留 1 位小数并带单位', () => {
    expect(formatHours(64)).toBe('64.0 学时')
    expect(formatHours(58.8)).toBe('58.8 学时')
  })
})

describe('formatPercent', () => {
  it('把比率转成百分比并保留 1 位小数', () => {
    expect(formatPercent(1.951)).toBe('195.1%')
    expect(formatPercent(0.706)).toBe('70.6%')
  })
})

describe('formatDate', () => {
  it('截取到日期部分', () => {
    expect(formatDate('2026-09-12T08:00:00.000Z')).toBe('2026-09-12')
    expect(formatDate('2026-09-12')).toBe('2026-09-12')
  })

  it('空值显示占位符', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })
})

describe('sectionRange', () => {
  it('连续节次显示为区间', () => {
    expect(sectionRange(1, 4)).toBe('第 1-4 节')
  })

  it('单节次只显示一次', () => {
    expect(sectionRange(3, 3)).toBe('第 3 节')
  })
})

describe('weekdayLabel', () => {
  it('1-7 映射到周一至周日', () => {
    expect(weekdayLabel(1)).toBe('周一')
    expect(weekdayLabel(5)).toBe('周五')
    expect(weekdayLabel(7)).toBe('周日')
  })

  it('越界值有兜底文案', () => {
    expect(weekdayLabel(9)).toBe('第9天')
  })
})

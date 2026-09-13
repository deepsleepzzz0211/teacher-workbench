import type { EChartsOption } from 'echarts'

import { ACHIEVEMENT_CATEGORY_LABELS, type AchievementCategory } from '@tw/shared'

import { palette } from '@/theme'

export function buildAchievementChartOption(byCategory: Record<string, number>): EChartsOption {
  const entries = Object.entries(byCategory).filter(([, count]) => count > 0)

  return {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: entries.map(([category]) => ACHIEVEMENT_CATEGORY_LABELS[category as AchievementCategory]),
      axisLabel: { fontSize: 11, interval: 0, rotate: 18 },
    },
    yAxis: { type: 'value' as const, minInterval: 1, splitLine: { lineStyle: { type: 'dashed' as const } } },
    series: [
      {
        type: 'bar' as const,
        barWidth: 26,
        itemStyle: { color: palette.primary, borderRadius: [6, 6, 0, 0] },
        data: entries.map(([, count]) => count),
      },
    ],
  }
}

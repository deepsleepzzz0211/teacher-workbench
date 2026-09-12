import type { EChartsOption } from 'echarts'

import {
  ACHIEVEMENT_CATEGORY_LABELS,
  type AchievementCategory,
  ACHIEVEMENT_LEVEL_LABELS,
  type AchievementLevel,
} from '@tw/shared'

import { palette } from '@/theme'

interface AchievementStats {
  byCategory: Record<string, number>
  byLevel: Record<string, number>
}

export function buildCategoryOption(stats: AchievementStats | undefined): EChartsOption {
  const entries = Object.entries(stats?.byCategory ?? {}).filter(([, count]) => count > 0)

  return {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: entries.map(([key]) => ACHIEVEMENT_CATEGORY_LABELS[key as AchievementCategory]),
      axisLabel: { fontSize: 11, interval: 0 },
    },
    yAxis: { type: 'value' as const, minInterval: 1, splitLine: { lineStyle: { type: 'dashed' as const } } },
    series: [
      {
        type: 'bar' as const,
        barWidth: 28,
        itemStyle: { color: palette.primary, borderRadius: [6, 6, 0, 0] },
        data: entries.map(([, count]) => count),
      },
    ],
  }
}

export function buildLevelOption(stats: AchievementStats | undefined): EChartsOption {
  const entries = Object.entries(stats?.byLevel ?? {}).filter(([, count]) => count > 0)

  return {
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0, icon: 'circle' },
    series: [
      {
        type: 'pie' as const,
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        itemStyle: { borderColor: palette.surface, borderWidth: 2 },
        label: { formatter: '{b}: {c}' },
        data: entries.map(([key, count]) => ({
          name: ACHIEVEMENT_LEVEL_LABELS[key as AchievementLevel],
          value: count,
        })),
      },
    ],
  }
}

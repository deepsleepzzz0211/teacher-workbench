import type { EChartsOption } from 'echarts'

import { COURSE_TYPE_LABELS, type CourseType, type WorkloadSummaryView } from '@tw/shared'

import { palette } from '@/theme'

export function buildWeeklyOption(summary: WorkloadSummaryView | undefined): EChartsOption {
  return {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 8, right: 16, top: 20, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: (summary?.weekly ?? []).map((entry) => `第${entry.week}周`),
      axisLabel: { fontSize: 10, interval: 1 },
    },
    yAxis: { type: 'value' as const, name: '学时', splitLine: { lineStyle: { type: 'dashed' as const } } },
    series: [
      {
        type: 'bar' as const,
        data: (summary?.weekly ?? []).map((entry) => entry.hours),
        itemStyle: { color: palette.primary, borderRadius: [4, 4, 0, 0] },
      },
    ],
  }
}

export function buildCourseTypeOption(summary: WorkloadSummaryView | undefined): EChartsOption {
  const entries = Object.entries(summary?.byCourseType ?? {}).filter(([, hours]) => hours > 0)

  return {
    tooltip: { trigger: 'item' as const },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: entries.map(([type]) => COURSE_TYPE_LABELS[type as CourseType]),
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value' as const, name: '学时', splitLine: { lineStyle: { type: 'dashed' as const } } },
    series: [
      {
        type: 'bar' as const,
        barWidth: 36,
        data: entries.map(([, hours]) => hours),
        itemStyle: { color: palette.chartSeries, borderRadius: [6, 6, 0, 0] },
      },
    ],
  }
}

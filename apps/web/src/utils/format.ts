export function formatHours(value: number): string {
  return `${value.toFixed(1)} 学时`
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

export function formatDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '—'
}

export function sectionRange(startSection: number, endSection: number): string {
  return startSection === endSection ? `第 ${startSection} 节` : `第 ${startSection}-${endSection} 节`
}

export function weekdayLabel(weekday: number): string {
  return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][weekday - 1] ?? `第${weekday}天`
}

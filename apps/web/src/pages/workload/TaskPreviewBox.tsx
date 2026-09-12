import type { ReactNode } from 'react'

import { Card, Flex, Typography } from 'antd'

import { calcTaskEffectiveHours, COURSE_TYPE_COEFFICIENTS, COURSE_TYPE_LABELS, explainTaskCalculation } from '@tw/shared'

import { palette } from '@/theme'

import type { TaskPreview } from './types'

export function TaskPreviewBox({ preview }: { preview: TaskPreview }): ReactNode {
  const effectiveHours = calcTaskEffectiveHours({
    totalHours: preview.totalHours,
    courseType: preview.courseType,
    studentCount: preview.studentCount,
    repeatIndex: preview.repeatIndex,
  })
  const detail = explainTaskCalculation({
    totalHours: preview.totalHours,
    courseType: preview.courseType,
    studentCount: preview.studentCount,
    repeatIndex: preview.repeatIndex,
  })
  const baseCoefficient = COURSE_TYPE_COEFFICIENTS[preview.courseType]

  return (
    <Card size="small" style={{ background: palette.surfaceMuted, borderColor: palette.primarySoftBorder }}>
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          折算预览
        </Typography.Text>
        <Typography.Text strong style={{ fontSize: 16, color: palette.primary }}>
          {effectiveHours.toFixed(1)} 折算学时
        </Typography.Text>
      </Flex>
      <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.9, color: palette.textSecondary }}>
        {detail.totalHours || 0} 学时 × {baseCoefficient.toFixed(2)}（{COURSE_TYPE_LABELS[preview.courseType]}）×{' '}
        {detail.classSizeFactor.toFixed(2)}（{preview.studentCount || 0} 人）×{' '}
        {detail.repeatFactor.toFixed(2)}（
        {preview.repeatIndex > 1 ? `第 ${preview.repeatIndex} 次授课` : '首次授课'}）
      </div>
    </Card>
  )
}

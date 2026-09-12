import type { ReactNode } from 'react'

import { Card, Flex, Typography } from 'antd'

import { palette } from '@/theme'

export function PageHeader({
  title,
  description,
  extra,
}: {
  title: string
  description?: string
  extra?: ReactNode
}): ReactNode {
  return (
    <Flex justify="space-between" align="flex-start" style={{ marginBottom: 20 }} gap={16} wrap>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {description ? (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {description}
          </Typography.Text>
        ) : null}
      </div>
      {extra}
    </Flex>
  )
}

export function StatCard({
  title,
  value,
  suffix,
  prefix,
  hint,
  status,
  tone = 'default',
}: {
  title: string
  value: ReactNode
  suffix?: ReactNode
  prefix?: ReactNode
  hint?: ReactNode
  status?: ReactNode
  tone?: 'default' | 'primary' | 'success' | 'warning'
}): ReactNode {
  const accent: Record<string, string> = {
    default: palette.primary,
    primary: palette.primary,
    success: palette.success,
    warning: palette.warning,
  }

  return (
    <Card size="small" styles={{ body: { padding: 18 } }}>
      <Flex vertical gap={6}>
        <Flex justify="space-between" align="center">
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {title}
          </Typography.Text>
          {status}
        </Flex>
        <Typography.Title level={3} style={{ margin: 0, color: accent[tone] }}>
          {prefix}
          {value}
          {suffix ? (
            <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 6, color: palette.textMuted }}>{suffix}</span>
          ) : null}
        </Typography.Title>
        {hint ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {hint}
          </Typography.Text>
        ) : null}
      </Flex>
    </Card>
  )
}

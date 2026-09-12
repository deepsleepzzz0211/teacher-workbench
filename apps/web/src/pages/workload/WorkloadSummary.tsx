import type { ReactNode } from 'react'

import { Alert, Card, Col, Flex, Progress, Row, Skeleton, Tag, Typography } from 'antd'
import type { EChartsOption } from 'echarts'

import { TERM_REQUIRED_HOURS, type WorkloadSummaryView } from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { EChart } from '@/components/EChart'
import { StatCard } from '@/components/PageHeader'
import { StatRow } from '@/components/blocks'
import { palette } from '@/theme'

interface WorkloadSummaryProps {
  summary: WorkloadSummaryView | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  weeklyOption: EChartsOption
  courseTypeOption: EChartsOption
}

export function WorkloadSummary({
  summary,
  isLoading,
  isError,
  error,
  weeklyOption,
  courseTypeOption,
}: WorkloadSummaryProps): ReactNode {
  const rate = summary?.achievementRate ?? 0
  const overHours = summary ? Math.max(0, summary.totalHours - summary.requiredHours) : 0

  return (
    <>
      {isError ? (
        <Alert type="error" showIcon message="工作量汇总加载失败" description={getErrorMessage(error)} />
      ) : null}

      <StatRow>
        <StatCard
          title="总折算学时"
          value={(summary?.totalHours ?? 0).toFixed(1)}
          suffix="学时"
          tone="primary"
        />
        <StatCard title="课堂教学" value={(summary?.taskHours ?? 0).toFixed(1)} suffix="学时" />
        <StatCard title="其它工作量" value={(summary?.itemHours ?? 0).toFixed(1)} suffix="学时" />
        <StatCard
          title="达成率"
          value={`${(rate * 100).toFixed(1)}%`}
          tone={rate >= 1 ? 'success' : 'warning'}
          status={rate >= 1 ? <Tag color="success">已达标</Tag> : <Tag color="warning">待完成</Tag>}
          hint={`总计 ${(summary?.totalHours ?? 0).toFixed(1)} / ${summary?.requiredHours ?? TERM_REQUIRED_HOURS} 学时`}
        />
      </StatRow>

      <Card>
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <Flex vertical gap={8}>
            <Flex justify="space-between">
              <Typography.Text type="secondary">
                折算学时 / 学期基本工作量（{summary?.requiredHours ?? TERM_REQUIRED_HOURS} 学时）
              </Typography.Text>
              <Typography.Text strong>
                {(summary?.totalHours ?? 0).toFixed(1)} / {summary?.requiredHours ?? TERM_REQUIRED_HOURS}
              </Typography.Text>
            </Flex>
            <Progress
              percent={Math.min(100, Math.round(rate * 1000) / 10)}
              status={rate >= 1 ? 'success' : 'active'}
              strokeColor={palette.primary}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {rate >= 1
                ? `已超出基本工作量 ${overHours.toFixed(1)} 折算学时，超出部分计入超课时`
                : `距离基本工作量还差 ${((summary?.requiredHours ?? TERM_REQUIRED_HOURS) - (summary?.totalHours ?? 0)).toFixed(1)} 折算学时`}
            </Typography.Text>
          </Flex>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="周学时分布">
            {isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : <EChart option={weeklyOption} height={260} />}
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="课程类型构成">
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <EChart option={courseTypeOption} height={260} />
            )}
          </Card>
        </Col>
      </Row>
    </>
  )
}

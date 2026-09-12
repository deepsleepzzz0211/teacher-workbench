import type { ReactNode } from 'react'

import { Card, Col, Row, Skeleton } from 'antd'
import type { EChartsOption } from 'echarts'

import { EChart } from '@/components/EChart'
import { StatCard } from '@/components/PageHeader'
import { StatRow } from '@/components/blocks'

interface AchievementStatsProps {
  total: number
  scoreSum: number
  byLevel: Record<string, number>
  isLoading: boolean
  categoryOption: EChartsOption
  levelOption: EChartsOption
}

export function AchievementStats({
  total,
  scoreSum,
  byLevel,
  isLoading,
  categoryOption,
  levelOption,
}: AchievementStatsProps): ReactNode {
  return (
    <>
      <StatRow>
        <StatCard title="成果总数" value={total} suffix="项" tone="primary" />
        <StatCard title="业绩总分" value={scoreSum} suffix="分" tone="success" />
        <StatCard title="国家级及以上" value={byLevel.national ?? 0} suffix="项" />
        <StatCard title="省级" value={byLevel.provincial ?? 0} suffix="项" />
      </StatRow>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="按类别分布">
            {isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : <EChart option={categoryOption} height={260} />}
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="按级别分布">
            {isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : <EChart option={levelOption} height={260} />}
          </Card>
        </Col>
      </Row>
    </>
  )
}

import type { ReactNode } from 'react'

import { Card, Col, Empty, Flex, List, Row, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { ACHIEVEMENT_CATEGORY_LABELS, type DashboardOverview } from '@tw/shared'

import { EChart } from '@/components/EChart'
import { formatDate } from '@/utils/format'

import { buildAchievementChartOption } from './chartOptions'

export function AchievementPanel({ data }: { data: DashboardOverview }): ReactNode {
  const option = buildAchievementChartOption(data.achievement.byCategory)

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={14}>
        <Card title="教科研成果构成">
          {data.achievement.total === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无成果记录" />
          ) : (
            <EChart option={option} height={260} />
          )}
        </Card>
      </Col>

      <Col xs={24} xl={10}>
        <Card title="最近登记成果" extra={<Link to="/achievements">全部成果</Link>}>
          {data.achievement.recent.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无成果记录" />
          ) : (
            <List
              size="small"
              dataSource={data.achievement.recent}
              renderItem={(achievement) => (
                <List.Item>
                  <Flex vertical gap={2} style={{ width: '100%' }}>
                    <Typography.Text ellipsis>{achievement.title}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {ACHIEVEMENT_CATEGORY_LABELS[achievement.category]} · {achievement.role} ·{' '}
                      {formatDate(achievement.achievedOn)} · {achievement.score} 分
                    </Typography.Text>
                  </Flex>
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}

import type { ReactNode } from 'react'

import { Card, Col, Empty, Flex, Progress, Row, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { COURSE_TYPE_LABELS, type CourseType, type DashboardOverview } from '@tw/shared'

import { palette } from '@/theme'
import { formatHours } from '@/utils/format'

export function ProgressPanels({ data }: { data: DashboardOverview }): ReactNode {
  const workload = data.workload
  const rate = workload ? workload.achievementRate : 0
  const overHours = workload ? Math.max(0, workload.totalHours - workload.requiredHours) : 0

  return (
    <Col xs={24} xl={9}>
      <Card title="教学工作量达成情况" style={{ marginBottom: 16 }}>
        {workload ? (
          <Flex vertical gap={16}>
            <div>
              <Flex justify="space-between" style={{ marginBottom: 6 }}>
                <Typography.Text type="secondary">折算学时 / 基本工作量</Typography.Text>
                <Typography.Text strong>
                  {workload.totalHours.toFixed(1)} / {workload.requiredHours}
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
                  : `距离基本工作量还差 ${(workload.requiredHours - workload.totalHours).toFixed(1)} 折算学时`}
              </Typography.Text>
            </div>

            <Row gutter={12}>
              <Col span={12}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  课堂教学
                </Typography.Text>
                <div>
                  <Typography.Text strong style={{ fontSize: 18 }}>
                    {formatHours(workload.taskHours)}
                  </Typography.Text>
                </div>
              </Col>
              <Col span={12}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  其它工作量
                </Typography.Text>
                <div>
                  <Typography.Text strong style={{ fontSize: 18 }}>
                    {formatHours(workload.itemHours)}
                  </Typography.Text>
                </div>
              </Col>
            </Row>

            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                课程类型构成
              </Typography.Text>
              <Flex vertical gap={6} style={{ marginTop: 8 }}>
                {Object.entries(workload.byCourseType)
                  .filter(([, hours]) => hours > 0)
                  .map(([type, hours]) => (
                    <Flex key={type} justify="space-between" align="center">
                      <Tag>{COURSE_TYPE_LABELS[type as CourseType]}</Tag>
                      <Typography.Text style={{ fontSize: 13 }}>{formatHours(hours)}</Typography.Text>
                    </Flex>
                  ))}
              </Flex>
            </div>

            <Link to="/workload">前往教学工作量 →</Link>
          </Flex>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无工作量数据" />
        )}
      </Card>

      <Card title="企业实践进度（双师型）">
        <Flex vertical gap={10}>
          <Progress
            percent={Math.min(100, Math.round(data.practice.rate * 1000) / 10)}
            status={data.practice.rate >= 1 ? 'success' : 'active'}
            strokeColor={data.practice.rate >= 1 ? palette.success : palette.warning}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            近 5 年累计 {data.practice.accumulatedDays} 天 / 要求 {data.practice.requiredDays} 天
            {data.practice.remainingDays > 0 ? `，还差 ${data.practice.remainingDays} 天` : '，已满足政策要求'}
          </Typography.Text>
          <Link to="/practice">管理企业实践记录 →</Link>
        </Flex>
      </Card>
    </Col>
  )
}

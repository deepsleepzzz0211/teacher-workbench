import type { ReactNode } from 'react'

import { Alert, Card, Col, Empty, Flex, Row, Tag, Timeline, Typography } from 'antd'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'

import type { DashboardOverview } from '@tw/shared'

import { palette } from '@/theme'
import { sectionRange, weekdayLabel } from '@/utils/format'

const WEEKDAYS = [1, 2, 3, 4, 5]

export function TodayAndWeekCards({ data }: { data: DashboardOverview }): ReactNode {
  return (
    <Col xs={24} xl={15}>
      <Card
        title={data.today.showingFrom ? '最近教学日安排' : '今日课程安排'}
        extra={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(data.today.date).format('YYYY年M月D日')} {weekdayLabel(data.today.weekday)}
          </Typography.Text>
        }
        style={{ marginBottom: 16 }}
      >
        {data.today.showingFrom ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`今日无课，以下为最近教学日（${dayjs(data.today.showingFrom).format('M月D日')} ${weekdayLabel(dayjs(data.today.showingFrom).day() || 7)}）的安排`}
          />
        ) : null}

        {data.today.courses.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可展示的课程安排" />
        ) : (
          <Timeline
            items={data.today.courses.map((course) => ({
              color: palette.primary,
              children: (
                <Flex vertical gap={2}>
                  <Flex gap={8} align="center" wrap>
                    <Typography.Text strong>{course.courseName}</Typography.Text>
                    <Tag>{sectionRange(course.startSection, course.endSection)}</Tag>
                  </Flex>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {course.className}
                    {course.location ? ` · ${course.location}` : ''}
                  </Typography.Text>
                </Flex>
              ),
            }))}
          />
        )}
      </Card>

      <Card title="本周课表" extra={<Link to="/schedule">查看完整课表</Link>}>
        {data.weekSchedule.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本周暂无排课" />
        ) : (
          <Row gutter={[8, 8]}>
            {WEEKDAYS.map((weekday) => {
              const courses = data.weekSchedule
                .filter((entry) => entry.weekday === weekday)
                .sort((a, b) => a.startSection - b.startSection)

              return (
                <Col key={weekday} xs={24} sm={12} md={8} lg={4} flex="1 1 0">
                  <div
                    style={{
                      background: palette.surfaceMuted,
                      borderRadius: 8,
                      padding: 10,
                      minHeight: 96,
                      border: `1px solid ${palette.borderSubtle}`,
                    }}
                  >
                    <Typography.Text strong style={{ fontSize: 12 }}>
                      {weekdayLabel(weekday)}
                    </Typography.Text>
                    <Flex vertical gap={6} style={{ marginTop: 8 }}>
                      {courses.length === 0 ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          无课
                        </Typography.Text>
                      ) : (
                        courses.map((course) => (
                          <div
                            key={course.taskId}
                            style={{
                              background: palette.surface,
                              borderLeft: `3px solid ${palette.primary}`,
                              borderRadius: 4,
                              padding: '6px 8px',
                            }}
                          >
                            <Typography.Text style={{ fontSize: 12 }} ellipsis>
                              {course.courseName}
                            </Typography.Text>
                            <div>
                              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                {sectionRange(course.startSection, course.endSection)}
                              </Typography.Text>
                            </div>
                          </div>
                        ))
                      )}
                    </Flex>
                  </div>
                </Col>
              )
            })}
          </Row>
        )}
      </Card>
    </Col>
  )
}

import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Alert, Card, Col, Empty, Flex, Row, Select, Skeleton, Tag, Typography } from 'antd'

import {
  COURSE_TYPE_LABELS,
  type CourseType,
  MAX_WEEKS,
  WEEKDAY_LABELS,
} from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { catalogApi, scheduleApi } from '@/api/endpoints'
import { PageHeader, StatCard } from '@/components/PageHeader'
import { sectionRange } from '@/utils/format'

const TEACHING_WEEKDAYS = [1, 2, 3, 4, 5]

const COURSE_TYPE_COLORS: Record<CourseType, string> = {
  theory: '#1d4ed8',
  integrated: '#0ea5e9',
  practice: '#16a34a',
  internship: '#d97706',
}

const WEEK_OPTIONS = Array.from({ length: MAX_WEEKS }, (_, index) => ({
  label: `第 ${index + 1} 周`,
  value: index + 1,
}))

export function SchedulePage(): React.ReactNode {
  const [selectedTermId, setSelectedTermId] = useState<string | undefined>(undefined)
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>(undefined)

  const termsQuery = useQuery({ queryKey: ['catalog', 'terms'], queryFn: catalogApi.terms })
  const termId = selectedTermId ?? termsQuery.data?.find((term) => term.isCurrent)?.id

  const scheduleQuery = useQuery({
    queryKey: ['schedule', termId, selectedWeek],
    queryFn: () => scheduleApi.get({ termId, week: selectedWeek }),
    enabled: Boolean(termId),
  })

  const schedule = scheduleQuery.data
  const entries = schedule?.entries ?? []
  const currentWeek = schedule?.week ?? selectedWeek ?? 1

  const sectionCount = entries.reduce(
    (sum, entry) => sum + (entry.endSection - entry.startSection + 1),
    0,
  )

  if (termsQuery.isLoading) return <Skeleton active paragraph={{ rows: 8 }} />
  if (termsQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="学期数据加载失败"
        description={getErrorMessage(termsQuery.error)}
      />
    )
  }

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title="我的课表"
        description="按教学周查看本人全部授课安排；单双周课程会自动按周次过滤"
        extra={
          <Flex gap={8}>
            <Select
              style={{ width: 220 }}
              value={termId}
              onChange={(value) => {
                setSelectedTermId(value)
                setSelectedWeek(undefined)
              }}
              options={(termsQuery.data ?? []).map((term) => ({ label: term.name, value: term.id }))}
              placeholder="选择学期"
            />
            <Select
              style={{ width: 130 }}
              value={currentWeek}
              onChange={setSelectedWeek}
              options={WEEK_OPTIONS}
              placeholder="选择周次"
            />
          </Flex>
        }
      />

      {scheduleQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="课表加载失败"
          description={getErrorMessage(scheduleQuery.error)}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <StatCard title="本周课程数" value={entries.length} suffix="门" tone="primary" />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard title="本周课堂教学节数" value={sectionCount} suffix="节" />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title="当前教学周"
            value={currentWeek}
            suffix="周"
            hint={schedule?.term.name ?? ''}
          />
        </Col>
      </Row>

      <Card
        title="周课表"
        extra={
          <Flex gap={12} wrap>
            {(Object.keys(COURSE_TYPE_LABELS) as CourseType[]).map((type) => (
              <Flex key={type} align="center" gap={6}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: COURSE_TYPE_COLORS[type],
                  }}
                />
                <Typography.Text style={{ fontSize: 12 }} type="secondary">
                  {COURSE_TYPE_LABELS[type]}
                </Typography.Text>
              </Flex>
            ))}
          </Flex>
        }
      >
        {scheduleQuery.isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : entries.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`第 ${currentWeek} 教学周暂无排课（可能是单双周轮空，或该周不在授课周次范围内）`}
          />
        ) : (
          <Row gutter={[12, 12]} align="stretch">
            {TEACHING_WEEKDAYS.map((weekday) => {
              const dayEntries = entries
                .filter((entry) => entry.weekday === weekday)
                .sort((a, b) => a.startSection - b.startSection)

              return (
                <Col key={weekday} xs={24} sm={12} lg={8} xl={4} flex="1 1 0">
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #eef1f7',
                      borderRadius: 10,
                      padding: 12,
                      minHeight: 200,
                      height: '100%',
                    }}
                  >
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      {WEEKDAY_LABELS[weekday - 1]}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                      {dayEntries.length} 门
                    </Typography.Text>

                    <Flex vertical gap={8} style={{ marginTop: 10 }}>
                      {dayEntries.length === 0 ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          无课
                        </Typography.Text>
                      ) : (
                        dayEntries.map((entry) => (
                          <div
                            key={entry.taskId}
                            style={{
                              background: '#fff',
                              borderLeft: `4px solid ${COURSE_TYPE_COLORS[entry.courseType]}`,
                              borderRadius: 6,
                              padding: '8px 10px',
                              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                            }}
                          >
                            <Typography.Text strong style={{ fontSize: 13 }}>
                              {entry.courseName}
                            </Typography.Text>
                            <div style={{ marginTop: 4 }}>
                              <Tag
                                style={{ marginInlineEnd: 4 }}
                                color={COURSE_TYPE_COLORS[entry.courseType]}
                              >
                                {sectionRange(entry.startSection, entry.endSection)}
                              </Tag>
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {entry.className}
                              </Typography.Text>
                            </div>
                            {entry.location ? (
                              <div>
                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                  {entry.location}
                                </Typography.Text>
                              </div>
                            ) : null}
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
    </Flex>
  )
}

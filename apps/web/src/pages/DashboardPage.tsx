import { Alert, Card, Col, Empty, Flex, List, Progress, Row, Skeleton, Tag, Timeline, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'

import {
  ACHIEVEMENT_CATEGORY_LABELS,
  type AchievementCategory,
  COURSE_TYPE_LABELS,
  type CourseType,
  NOTICE_CATEGORY_LABELS,
  type NoticeCategory,
  TERM_REQUIRED_HOURS,
} from '@tw/shared'

import { dashboardApi } from '@/api/endpoints'
import { EChart } from '@/components/EChart'
import { PageHeader, StatCard } from '@/components/PageHeader'
import { TodoPriorityTag } from '@/components/tags'
import { formatDate, formatHours, formatPercent, sectionRange, weekdayLabel } from '@/utils/format'

const WEEKDAYS = [1, 2, 3, 4, 5]

function greeting(): string {
  const hour = dayjs().hour()
  if (hour < 6) return '凌晨好'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function DashboardPage(): React.ReactNode {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.overview,
  })

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />
  }

  if (isError || !data) {
    return (
      <Alert
        type="error"
        showIcon
        message="工作台数据加载失败"
        description={error instanceof Error ? error.message : '请稍后重试'}
      />
    )
  }

  const workload = data.workload
  const rate = workload ? workload.achievementRate : 0
  const overHours = workload ? Math.max(0, workload.totalHours - workload.requiredHours) : 0

  const achievementChartOption = {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: Object.entries(data.achievement.byCategory)
        .filter(([, count]) => count > 0)
        .map(([category]) => ACHIEVEMENT_CATEGORY_LABELS[category as AchievementCategory]),
      axisLabel: { fontSize: 11, interval: 0, rotate: 18 },
    },
    yAxis: { type: 'value' as const, minInterval: 1, splitLine: { lineStyle: { type: 'dashed' as const } } },
    series: [
      {
        type: 'bar' as const,
        barWidth: 26,
        itemStyle: { color: '#1d4ed8', borderRadius: [6, 6, 0, 0] },
        data: Object.entries(data.achievement.byCategory)
          .filter(([, count]) => count > 0)
          .map(([, count]) => count),
      },
    ],
  }

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title={`${greeting()}，${data.teacher.name} 老师`}
        description={
          data.currentTerm
            ? `${data.teacher.department} · ${data.teacher.title} · ${data.currentTerm.name}（第 ${data.currentTerm.week} 教学周）`
            : `${data.teacher.department} · ${data.teacher.title}`
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="本学期折算学时"
            value={workload ? workload.totalHours.toFixed(1) : '0.0'}
            suffix="学时"
            tone="primary"
            hint={`基本工作量 ${TERM_REQUIRED_HOURS} 学时 · 达成 ${formatPercent(rate)}`}
            status={
              rate >= 1 ? <Tag color="success">已达标</Tag> : <Tag color="warning">待完成</Tag>
            }
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="教科研成果"
            value={data.achievement.total}
            suffix="项"
            hint={`累计业绩分 ${data.achievement.scoreSum}`}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="企业实践累计"
            value={data.practice.accumulatedDays}
            suffix="天"
            tone={data.practice.rate >= 1 ? 'success' : 'warning'}
            hint={`近 5 年要求 ${data.practice.requiredDays} 天 · 还差 ${data.practice.remainingDays} 天`}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="待办事项"
            value={data.counters.pendingTodos}
            suffix="项待办"
            tone={data.counters.pendingTodos > 0 ? 'warning' : 'default'}
            hint={`未读通知 ${data.counters.unreadNotices} 条 · 待审批 ${data.counters.pendingApplications} 条`}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
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
                  color: '#1d4ed8',
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
                          background: '#f8fafc',
                          borderRadius: 8,
                          padding: 10,
                          minHeight: 96,
                          border: '1px solid #eef1f7',
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
                                  background: '#fff',
                                  borderLeft: '3px solid #1d4ed8',
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
                    strokeColor="#1d4ed8"
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
                strokeColor={data.practice.rate >= 1 ? '#16a34a' : '#d97706'}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                近 5 年累计 {data.practice.accumulatedDays} 天 / 要求 {data.practice.requiredDays} 天
                {data.practice.remainingDays > 0
                  ? `，还差 ${data.practice.remainingDays} 天`
                  : '，已满足政策要求'}
              </Typography.Text>
              <Link to="/practice">管理企业实践记录 →</Link>
            </Flex>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="待办事项" extra={<Link to="/todos">全部待办</Link>}>
            {data.todos.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待办，辛苦了" />
            ) : (
              <List
                size="small"
                dataSource={data.todos}
                renderItem={(todo) => (
                  <List.Item>
                    <Flex justify="space-between" align="center" style={{ width: '100%' }} gap={12}>
                      <Typography.Text ellipsis style={{ maxWidth: '62%' }}>
                        {todo.title}
                      </Typography.Text>
                      <Flex gap={8} align="center">
                        <TodoPriorityTag priority={todo.priority} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {formatDate(todo.dueDate)} 截止
                        </Typography.Text>
                      </Flex>
                    </Flex>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="最新通知" extra={<Link to="/notices">全部通知</Link>}>
            {data.notices.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知" />
            ) : (
              <List
                size="small"
                dataSource={data.notices}
                renderItem={(notice) => (
                  <List.Item>
                    <Flex justify="space-between" align="center" style={{ width: '100%' }} gap={12}>
                      <Flex gap={6} align="center" style={{ minWidth: 0 }}>
                        {notice.isTop ? <Tag color="red">置顶</Tag> : null}
                        {!notice.isRead ? <Tag color="blue">未读</Tag> : null}
                        <Typography.Text ellipsis style={{ maxWidth: 240 }}>
                          {notice.title}
                        </Typography.Text>
                      </Flex>
                      <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {NOTICE_CATEGORY_LABELS[notice.category as NoticeCategory]} ·{' '}
                        {dayjs(notice.publishedAt).format('M月D日')}
                      </Typography.Text>
                    </Flex>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="教科研成果构成">
            {data.achievement.total === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无成果记录" />
            ) : (
              <EChart option={achievementChartOption} height={260} />
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
    </Flex>
  )
}

import type { ReactNode } from 'react'

import { Card, Col, Empty, Flex, List, Row, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'

import { type DashboardOverview, NOTICE_CATEGORY_LABELS, type NoticeCategory } from '@tw/shared'

import { TodoPriorityTag } from '@/components/tags'
import { formatDate } from '@/utils/format'

export function ListPanels({ data }: { data: DashboardOverview }): ReactNode {
  return (
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
  )
}

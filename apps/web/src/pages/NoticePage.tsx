import { useState } from 'react'

import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App as AntApp,
  Badge,
  Button,
  Card,
  Drawer,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Switch,
  Tag,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import {
  NOTICE_CATEGORIES,
  NOTICE_CATEGORY_LABELS,
  type Notice,
  type NoticeCategory,
} from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { noticeApi } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { PageHeader } from '@/components/PageHeader'

interface NoticeFormValues {
  title: string
  content: string
  category: NoticeCategory
  isTop: boolean
}

const CATEGORY_OPTIONS = NOTICE_CATEGORIES.map((value) => ({
  label: NOTICE_CATEGORY_LABELS[value],
  value,
}))

export function NoticePage(): React.ReactNode {
  const { message } = AntApp.useApp()
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [active, setActive] = useState<Notice | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [form] = Form.useForm<NoticeFormValues>()

  const listQuery = useQuery({
    queryKey: ['notices', page, pageSize],
    queryFn: () => noticeApi.list({ page, pageSize }),
  })

  const markReadMutation = useMutation({
    mutationFn: noticeApi.markRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notices'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const publishMutation = useMutation({
    mutationFn: noticeApi.create,
    onSuccess: () => {
      message.success('通知已发布')
      setPublishOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['notices'] })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const openDetail = (notice: Notice): void => {
    setActive(notice)
    if (!notice.isRead) markReadMutation.mutate(notice.id)
  }

  const submitPublish = async (): Promise<void> => {
    const values = await form.validateFields()
    publishMutation.mutate({
      title: values.title,
      content: values.content,
      category: values.category,
      isTop: values.isTop ?? false,
    })
  }

  const unreadCount = listQuery.data?.unreadCount ?? 0

  if (listQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="通知加载失败"
        description={getErrorMessage(listQuery.error)}
      />
    )
  }

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title="通知公告"
        description="置顶优先、时间倒序；打开详情即自动标记为已读"
        extra={
          <Flex gap={12} align="center">
            <Badge count={unreadCount} offset={[-2, 2]}>
              <Tag color={unreadCount > 0 ? 'blue' : 'default'}>未读 {unreadCount} 条</Tag>
            </Badge>
            {isAdmin ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  form.resetFields()
                  form.setFieldsValue({ category: 'academic', isTop: false })
                  setPublishOpen(true)
                }}
              >
                发布通知
              </Button>
            ) : null}
          </Flex>
        }
      />

      <Card>
        {listQuery.isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={listQuery.data?.items ?? []}
            renderItem={(notice) => (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={() => openDetail(notice)}
                actions={[
                  <Typography.Text key="time" type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(notice.publishedAt).format('YYYY-MM-DD HH:mm')}
                  </Typography.Text>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Flex gap={8} align="center" wrap>
                      {notice.isTop ? <Tag color="red">置顶</Tag> : null}
                      {!notice.isRead ? <Tag color="blue">未读</Tag> : null}
                      <Tag>{NOTICE_CATEGORY_LABELS[notice.category]}</Tag>
                      <Typography.Text strong>{notice.title}</Typography.Text>
                    </Flex>
                  }
                  description={
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      发布人：{notice.publisherName}
                    </Typography.Text>
                  }
                />
              </List.Item>
            )}
          />
        )}

        {(listQuery.data?.total ?? 0) > 0 ? (
          <Flex justify="flex-end" style={{ marginTop: 16 }}>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={listQuery.data?.total ?? 0}
              showSizeChanger
              showTotal={(total) => `共 ${total} 条通知`}
              onChange={(nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
              }}
            />
          </Flex>
        ) : null}
      </Card>

      <Drawer
        width={640}
        open={active !== null}
        onClose={() => setActive(null)}
        title={active?.title ?? ''}
        destroyOnHidden
      >
        {active ? (
          <Flex vertical gap={16}>
            <Flex gap={8} align="center" wrap>
              {active.isTop ? <Tag color="red">置顶</Tag> : null}
              <Tag>{NOTICE_CATEGORY_LABELS[active.category]}</Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {active.publisherName} · {dayjs(active.publishedAt).format('YYYY-MM-DD HH:mm')}
              </Typography.Text>
            </Flex>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
              {active.content}
            </Typography.Paragraph>
          </Flex>
        ) : null}
      </Drawer>

      <Modal
        title="发布通知"
        open={publishOpen}
        onCancel={() => setPublishOpen(false)}
        onOk={submitPublish}
        confirmLoading={publishMutation.isPending}
        okText="发布"
        cancelText="取消"
        width={680}
        destroyOnHidden
      >
        <Form<NoticeFormValues> form={form} layout="vertical">
          <Form.Item
            name="title"
            label="通知标题"
            rules={[
              { required: true, message: '请填写通知标题' },
              { min: 2, message: '标题至少 2 个字' },
            ]}
          >
            <Input placeholder="例如 关于开展本学期期终教学检查的通知" />
          </Form.Item>
          <Form.Item name="category" label="通知类别" rules={[{ required: true, message: '请选择通知类别' }]}>
            <Select options={CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="content"
            label="通知正文"
            rules={[
              { required: true, message: '请填写通知正文' },
              { min: 2, message: '正文至少 2 个字' },
            ]}
          >
            <Input.TextArea rows={8} placeholder="支持多行文本，换行会原样保留" />
          </Form.Item>
          <Form.Item name="isTop" label="是否置顶" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  )
}

import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App as AntApp, Button, Card, Empty, Flex, Input, Modal, Space, Table, Tag, Tooltip, Typography } from 'antd'

import {
  type ApplicationRecord,
  APPLICATION_TYPE_LABELS,
  type ApplicationType,
} from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { applicationApi } from '@/api/endpoints'
import { type Columns } from '@/components/blocks'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { formatDate } from '@/utils/format'

export function PendingApprovals(): React.ReactNode {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const [reviewTarget, setReviewTarget] = useState<{
    record: ApplicationRecord
    decision: 'approved' | 'rejected'
  } | null>(null)
  const [comment, setComment] = useState('')
  const reviewGuard = useUnsavedChanges(() => comment.trim().length > 0)

  const pendingQuery = useQuery({ queryKey: ['applications', 'pending'], queryFn: applicationApi.pending })

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision, remark }: { id: string; decision: 'approved' | 'rejected'; remark: string }) =>
      applicationApi.review(id, { decision, comment: remark }),
    onSuccess: (record) => {
      message.success(record.status === 'approved' ? '已通过该申请' : '已驳回该申请')
      setReviewTarget(null)
      setComment('')
      void queryClient.invalidateQueries({ queryKey: ['applications'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const openReview = (record: ApplicationRecord, decision: 'approved' | 'rejected'): void => {
    setReviewTarget({ record, decision })
    setComment('')
  }

  const columns: Columns<ApplicationRecord> = [
    { title: '申请人', dataIndex: 'teacherName', width: 100 },
    {
      title: '申请类型',
      dataIndex: 'type',
      width: 110,
      render: (value: ApplicationType) => <Tag>{APPLICATION_TYPE_LABELS[value]}</Tag>,
    },
    {
      title: '关联课程 / 班级',
      key: 'course',
      width: 220,
      render: (_, record) => (record.courseName ? `${record.courseName} · ${record.className ?? ''}` : '—'),
    },
    {
      title: '原上课时间',
      key: 'original',
      width: 170,
      render: (_, record) => `${formatDate(record.originalDate)} ${record.originalSection}`.trim(),
    },
    {
      title: '调整后时间',
      key: 'target',
      width: 170,
      render: (_, record) =>
        record.targetDate ? `${formatDate(record.targetDate)} ${record.targetSection}`.trim() : '—',
    },
    {
      title: '事由',
      dataIndex: 'reason',
      ellipsis: { showTitle: false },
      render: (value: string) => (
        <Tooltip title={value}>
          <span>{value}</span>
        </Tooltip>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      width: 120,
      render: (value: string) => formatDate(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openReview(record, 'approved')}>
            通过
          </Button>
          <Button type="link" size="small" danger onClick={() => openReview(record, 'rejected')}>
            驳回
          </Button>
        </Space>
      ),
    },
  ]

  const records = pendingQuery.data ?? []

  return (
    <Flex vertical gap={16}>
      {pendingQuery.isError ? (
        <Alert type="error" showIcon message="待审批列表加载失败" description={getErrorMessage(pendingQuery.error)} />
      ) : null}

      {!pendingQuery.isLoading && records.length === 0 ? (
        <Card>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有待审批的申请" />
        </Card>
      ) : (
        <Table<ApplicationRecord>
          rowKey="id"
          size="middle"
          loading={pendingQuery.isLoading}
          dataSource={records}
          columns={columns}
          pagination={false}
          scroll={{ x: 1200 }}
        />
      )}

      <Modal
        title={reviewTarget?.decision === 'approved' ? '通过申请' : '驳回申请'}
        open={reviewTarget !== null}
        onCancel={() =>
          reviewGuard.requestClose(() => {
            setComment('')
            setReviewTarget(null)
          })
        }
        onOk={() => {
          if (!reviewTarget) return
          reviewMutation.mutate({
            id: reviewTarget.record.id,
            decision: reviewTarget.decision,
            remark: comment,
          })
        }}
        confirmLoading={reviewMutation.isPending}
        okText={reviewTarget?.decision === 'approved' ? '确认通过' : '确认驳回'}
        cancelText="取消"
        destroyOnHidden
      >
        {reviewTarget ? (
          <Flex vertical gap={12}>
            <Typography.Text type="secondary">
              申请人：{reviewTarget.record.teacherName} · {APPLICATION_TYPE_LABELS[reviewTarget.record.type]}
            </Typography.Text>
            <Typography.Text>{reviewTarget.record.reason}</Typography.Text>
            <Input.TextArea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="审批意见（选填）"
            />
          </Flex>
        ) : null}
      </Modal>

      {reviewGuard.confirmNode}
    </Flex>
  )
}

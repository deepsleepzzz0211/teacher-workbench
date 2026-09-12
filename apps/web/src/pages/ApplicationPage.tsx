import { useState } from 'react'

import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Radio,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { TableProps } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import {
  type ApplicationRecord,
  type ApplicationStatus,
  APPLICATION_TYPE_LABELS,
  type ApplicationType,
} from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { applicationApi, workloadApi } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import { ApplicationStatusTag } from '@/components/tags'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { formatDate } from '@/utils/format'

type Columns<T> = NonNullable<TableProps<T>['columns']>

interface ApplicationFormValues {
  type: ApplicationType
  taskId?: string
  originalDate: Dayjs
  originalSection?: string
  targetDate?: Dayjs
  targetSection?: string
  reason: string
}

const STATUS_FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
]

function MyApplications(): React.ReactNode {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [modalOpen, setModalOpen] = useState(false)
  const [type, setType] = useState<ApplicationType>('adjust_class')
  const [form] = Form.useForm<ApplicationFormValues>()
  const guard = useUnsavedChanges(form)

  const status = statusFilter === 'all' ? undefined : (statusFilter as ApplicationStatus)

  const listQuery = useQuery({
    queryKey: ['applications', 'mine', status, page, pageSize],
    queryFn: () => applicationApi.list({ status, mine: true, page, pageSize }),
  })

  const tasksQuery = useQuery({ queryKey: ['workload', 'tasks', 'current'], queryFn: () => workloadApi.tasks() })

  const createMutation = useMutation({
    mutationFn: applicationApi.create,
    onSuccess: () => {
      message.success('申请已提交，等待院系管理员审批')
      setModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['applications'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const openCreate = (): void => {
    setType('adjust_class')
    form.resetFields()
    form.setFieldsValue({ type: 'adjust_class', originalDate: dayjs(), originalSection: '', targetSection: '' })
    setModalOpen(true)
  }

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    createMutation.mutate({
      type: values.type,
      taskId: values.taskId,
      originalDate: values.originalDate.format('YYYY-MM-DD'),
      originalSection: values.originalSection ?? '',
      targetDate: values.targetDate ? values.targetDate.format('YYYY-MM-DD') : undefined,
      targetSection: values.targetSection ?? '',
      reason: values.reason,
    })
  }

  const isAdjust = type === 'adjust_class'

  const columns: Columns<ApplicationRecord> = [
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
      render: (_, record) =>
        record.courseName ? `${record.courseName} · ${record.className ?? ''}` : '—',
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
        record.targetDate
          ? `${formatDate(record.targetDate)} ${record.targetSection}`.trim()
          : '—',
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
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: ApplicationStatus) => <ApplicationStatusTag status={value} />,
    },
    { title: '审批人', dataIndex: 'reviewerName', width: 100, render: (value: string | null) => value ?? '—' },
    {
      title: '审批意见',
      dataIndex: 'reviewComment',
      width: 180,
      ellipsis: true,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      width: 120,
      render: (value: string) => formatDate(value),
    },
  ]

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center" wrap gap={12}>
        <Segmented
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(String(value))
            setPage(1)
          }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          发起申请
        </Button>
      </Flex>

      {listQuery.isError ? (
        <Alert type="error" showIcon message="申请列表加载失败" description={getErrorMessage(listQuery.error)} />
      ) : (
        <Table<ApplicationRecord>
          rowKey="id"
          size="middle"
          loading={listQuery.isLoading}
          dataSource={listQuery.data?.items ?? []}
          columns={columns}
          scroll={{ x: 1300 }}
          pagination={{
            current: page,
            pageSize,
            total: listQuery.data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条申请`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
            },
          }}
        />
      )}

      <Modal
        title="发起调课 / 请假申请"
        open={modalOpen}
        onCancel={() => guard.requestClose(() => setModalOpen(false))}
        onOk={submit}
        confirmLoading={createMutation.isPending}
        okText="提交申请"
        cancelText="取消"
        width={640}
        destroyOnHidden
      >
        <Form<ApplicationFormValues>
          form={form}
          layout="vertical"
          onValuesChange={(changed) => {
            if (changed.type) setType(changed.type)
          }}
        >
          <Form.Item name="type" label="申请类型" rules={[{ required: true, message: '请选择申请类型' }]}>
            <Radio.Group>
              <Radio.Button value="adjust_class">调课申请</Radio.Button>
              <Radio.Button value="leave">请假申请</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="taskId" label="关联授课任务" extra="选填，便于管理员核对课程与班级">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="选择授课任务"
              options={(tasksQuery.data ?? []).map((task) => ({
                label: `${task.courseName} · ${task.className}`,
                value: task.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="originalDate"
            label="原上课日期"
            rules={[{ required: true, message: '请选择原上课日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="originalSection" label="原节次">
            <Input placeholder="例如 第1-4节" />
          </Form.Item>

          <Form.Item
            name="targetDate"
            label="调整后日期"
            rules={isAdjust ? [{ required: true, message: '调课申请需填写调整后日期' }] : []}
          >
            <DatePicker style={{ width: '100%' }} disabled={!isAdjust} />
          </Form.Item>

          <Form.Item name="targetSection" label="调整后节次">
            <Input placeholder="例如 第5-8节" disabled={!isAdjust} />
          </Form.Item>

          <Form.Item
            name="reason"
            label="申请事由"
            rules={[
              { required: true, message: '请填写申请事由' },
              { min: 5, message: '事由至少 5 个字，便于管理员判断' },
            ]}
          >
            <Input.TextArea rows={3} placeholder="请说明具体原因，例如赴企业参加产教融合项目对接会" />
          </Form.Item>
        </Form>
      </Modal>

      {guard.confirmNode}
    </Flex>
  )
}

function PendingApprovals(): React.ReactNode {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const [reviewTarget, setReviewTarget] = useState<{ record: ApplicationRecord; decision: 'approved' | 'rejected' } | null>(
    null,
  )
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
      render: (_, record) => (record.targetDate ? `${formatDate(record.targetDate)} ${record.targetSection}`.trim() : '—'),
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

export function ApplicationPage(): React.ReactNode {
  const { isAdmin } = useAuth()

  const tabs = [
    { key: 'mine', label: '我的申请', children: <MyApplications /> },
    ...(isAdmin ? [{ key: 'pending', label: '待我审批', children: <PendingApprovals /> }] : []),
  ]

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title="调课请假"
        description="提交调课 / 请假申请并跟踪审批状态；院系管理员在此完成审批"
      />
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs items={tabs} />
      </Card>
    </Flex>
  )
}

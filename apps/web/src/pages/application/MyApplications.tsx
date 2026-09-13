import { useState } from 'react'

import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App as AntApp, Button, Flex, Form, Segmented, Table, Tag, Tooltip } from 'antd'
import dayjs from 'dayjs'

import {
  type ApplicationRecord,
  type ApplicationStatus,
  APPLICATION_TYPE_LABELS,
  type ApplicationType,
} from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { applicationApi, workloadApi } from '@/api/endpoints'
import { type Columns } from '@/components/blocks'
import { ApplicationStatusTag } from '@/components/tags'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { formatDate } from '@/utils/format'

import { ApplicationFormModal } from './ApplicationFormModal'
import { STATUS_FILTER_OPTIONS, type ApplicationFormValues } from './types'

export function MyApplications(): React.ReactNode {
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

      <ApplicationFormModal
        open={modalOpen}
        form={form}
        tasks={tasksQuery.data ?? []}
        isAdjust={isAdjust}
        submitting={createMutation.isPending}
        onClose={() => guard.requestClose(() => setModalOpen(false))}
        onSubmit={submit}
        onValuesChange={(changed) => {
          if (changed.type) setType(changed.type)
        }}
      />

      {guard.confirmNode}
    </Flex>
  )
}

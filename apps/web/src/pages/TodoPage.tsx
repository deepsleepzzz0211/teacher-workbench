import { useMemo, useState } from 'react'

import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { TableProps } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import {
  TODO_PRIORITIES,
  TODO_PRIORITY_LABELS,
  type Todo,
  type TodoPriority,
  type TodoStatus,
} from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { todoApi } from '@/api/endpoints'
import { PageHeader, StatCard } from '@/components/PageHeader'
import { TodoPriorityTag } from '@/components/tags'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { formatDate } from '@/utils/format'

type Columns<T> = NonNullable<TableProps<T>['columns']>

interface TodoFormValues {
  title: string
  dueDate: Dayjs
  priority: TodoPriority
  relatedType?: string
}

const PRIORITY_OPTIONS = TODO_PRIORITIES.map((value) => ({
  label: TODO_PRIORITY_LABELS[value],
  value,
}))

const FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '未完成', value: 'pending' },
  { label: '已完成', value: 'done' },
]

export function TodoPage(): React.ReactNode {
  const { message, modal } = AntApp.useApp()
  const queryClient = useQueryClient()

  const [filter, setFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<TodoFormValues>()
  const guard = useUnsavedChanges(form)

  const status: TodoStatus | undefined = filter === 'all' ? undefined : (filter as TodoStatus)

  const listQuery = useQuery({
    queryKey: ['todos', status],
    queryFn: () => todoApi.list(status),
  })

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['todos'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: todoApi.create,
    onSuccess: () => {
      message.success('待办已新增')
      setModalOpen(false)
      invalidate()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: TodoStatus } }) =>
      todoApi.update(id, payload),
    onSuccess: () => invalidate(),
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const removeMutation = useMutation({
    mutationFn: todoApi.remove,
    onSuccess: () => {
      message.success('待办已删除')
      invalidate()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const todos = listQuery.data ?? []

  const counters = useMemo(() => {
    const pending = todos.filter((todo) => todo.status === 'pending')
    const done = todos.filter((todo) => todo.status === 'done')
    const overdue = pending.filter((todo) => dayjs(todo.dueDate).isBefore(dayjs(), 'day'))
    return { pending: pending.length, done: done.length, overdue: overdue.length }
  }, [todos])

  const openCreate = (): void => {
    form.resetFields()
    form.setFieldsValue({ dueDate: dayjs().add(7, 'day'), priority: 'medium', relatedType: '' })
    setModalOpen(true)
  }

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    createMutation.mutate({
      title: values.title,
      dueDate: values.dueDate.format('YYYY-MM-DD'),
      priority: values.priority,
      relatedType: values.relatedType ?? '',
    })
  }

  const confirmRemove = (record: Todo): void => {
    modal.confirm({
      title: '删除待办',
      content: `确定删除「${record.title}」吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => removeMutation.mutateAsync(record.id),
    })
  }

  const columns: Columns<Todo> = [
    {
      title: '完成',
      key: 'done',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={record.status === 'done'}
          onChange={(event) =>
            updateMutation.mutate({
              id: record.id,
              payload: { status: event.target.checked ? 'done' : 'pending' },
            })
          }
        />
      ),
    },
    {
      title: '待办内容',
      dataIndex: 'title',
      render: (value: string, record) => (
        <Typography.Text
          strong={record.status === 'pending'}
          delete={record.status === 'done'}
          type={record.status === 'done' ? 'secondary' : undefined}
        >
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 110,
      render: (value: TodoPriority) => <TodoPriorityTag priority={value} />,
    },
    {
      title: '截止日期',
      dataIndex: 'dueDate',
      width: 150,
      render: (value: string, record) => {
        const overdue = record.status === 'pending' && dayjs(value).isBefore(dayjs(), 'day')
        return (
          <Flex gap={6} align="center">
            <Typography.Text type={overdue ? 'danger' : undefined} strong={overdue}>
              {formatDate(value)}
            </Typography.Text>
            {overdue ? <Tag color="red">已逾期</Tag> : null}
          </Flex>
        )
      },
    },
    {
      title: '关联类型',
      dataIndex: 'relatedType',
      width: 120,
      render: (value: string) => value || '—',
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" danger onClick={() => confirmRemove(record)}>
          删除
        </Button>
      ),
    },
  ]

  if (listQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="待办加载失败"
        description={getErrorMessage(listQuery.error)}
      />
    )
  }

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title="待办事项"
        description="待办与截止提醒；标记完成后自动记录完成时间，逾期未完成会高亮提示"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增待办
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <StatCard title="未完成" value={counters.pending} suffix="项" tone="warning" />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard title="已完成" value={counters.done} suffix="项" tone="success" />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title="已逾期"
            value={counters.overdue}
            suffix="项"
            tone={counters.overdue > 0 ? 'warning' : 'default'}
          />
        </Col>
      </Row>

      <Card
        title={
          <Segmented
            options={FILTER_OPTIONS}
            value={filter}
            onChange={(value) => setFilter(String(value))}
          />
        }
      >
        <Table<Todo>
          rowKey="id"
          size="middle"
          loading={listQuery.isLoading}
          dataSource={todos}
          columns={columns}
          pagination={false}
          scroll={{ x: 860 }}
        />
      </Card>

      <Modal
        title="新增待办"
        open={modalOpen}
        onCancel={() => guard.requestClose(() => setModalOpen(false))}
        onOk={submit}
        confirmLoading={createMutation.isPending}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form<TodoFormValues> form={form} layout="vertical">
          <Form.Item name="title" label="待办内容" rules={[{ required: true, message: '请填写待办内容' }]}>
            <Input placeholder="例如 提交本学期教学任务确认单" />
          </Form.Item>
          <Form.Item name="dueDate" label="截止日期" rules={[{ required: true, message: '请选择截止日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}>
            <Select options={PRIORITY_OPTIONS} />
          </Form.Item>
          <Form.Item name="relatedType" label="关联类型">
            <Input placeholder="选填，例如 教学任务 / 教科研 / 师资认定" />
          </Form.Item>
        </Form>
      </Modal>

      {guard.confirmNode}
    </Flex>
  )
}

import { useState } from 'react'

import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { TableProps } from 'antd'
import type { Dayjs } from 'dayjs'

import {
  type EnterprisePractice,
  PRACTICE_REQUIRED_DAYS,
  PRACTICE_WINDOW_YEARS,
} from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { practiceApi } from '@/api/endpoints'
import { PageHeader, StatCard } from '@/components/PageHeader'
import { formatDate } from '@/utils/format'

type Columns<T> = NonNullable<TableProps<T>['columns']>

interface PracticeFormValues {
  company: string
  position: string
  range: [Dayjs, Dayjs]
  days?: number
  description?: string
}

export function PracticePage(): React.ReactNode {
  const { message, modal } = AntApp.useApp()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<PracticeFormValues>()

  const progressQuery = useQuery({ queryKey: ['practices'], queryFn: practiceApi.progress })

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['practices'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: practiceApi.create,
    onSuccess: () => {
      message.success('企业实践记录已登记')
      setModalOpen(false)
      invalidate()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const removeMutation = useMutation({
    mutationFn: practiceApi.remove,
    onSuccess: () => {
      message.success('企业实践记录已删除')
      invalidate()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const progress = progressQuery.data
  const rate = progress?.rate ?? 0

  const openCreate = (): void => {
    form.resetFields()
    form.setFieldsValue({ description: '' })
    setModalOpen(true)
  }

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    createMutation.mutate({
      company: values.company,
      position: values.position,
      startDate: values.range[0].format('YYYY-MM-DD'),
      endDate: values.range[1].format('YYYY-MM-DD'),
      days: values.days,
      description: values.description ?? '',
    })
  }

  const confirmRemove = (record: EnterprisePractice): void => {
    modal.confirm({
      title: '删除企业实践记录',
      content: `确定删除「${record.company}」的实践记录吗？删除后累计天数会同步减少。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => removeMutation.mutateAsync(record.id),
    })
  }

  const columns: Columns<EnterprisePractice> = [
    {
      title: '实践企业',
      dataIndex: 'company',
      width: 240,
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    { title: '实践岗位', dataIndex: 'position', width: 160 },
    {
      title: '起止日期',
      key: 'range',
      width: 210,
      render: (_, record) => `${formatDate(record.startDate)} ~ ${formatDate(record.endDate)}`,
    },
    {
      title: '实践天数',
      dataIndex: 'days',
      width: 110,
      align: 'right',
      render: (value: number) => <Typography.Text strong>{value} 天</Typography.Text>,
    },
    {
      title: '实践内容',
      dataIndex: 'description',
      ellipsis: { showTitle: false },
      render: (value: string) =>
        value ? (
          <Tooltip title={value}>
            <span>{value}</span>
          </Tooltip>
        ) : (
          '—'
        ),
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

  if (progressQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="企业实践数据加载失败"
        description={getErrorMessage(progressQuery.error)}
      />
    )
  }

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title="企业实践"
        description={`依据"双师型"教师认定要求，专任教师每 ${PRACTICE_WINDOW_YEARS} 年应赴企业集中实践累计 6 个月（约 ${PRACTICE_REQUIRED_DAYS} 天）；本页按滚动窗口自动统计累计天数`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            登记实践经历
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <StatCard
            title="近 5 年累计实践"
            value={progress?.accumulatedDays ?? 0}
            suffix="天"
            tone="primary"
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title="达标率"
            value={`${(rate * 100).toFixed(1)}%`}
            tone={rate >= 1 ? 'success' : 'warning'}
            status={rate >= 1 ? <Tag color="success">已满足</Tag> : <Tag color="warning">进行中</Tag>}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title="还差天数"
            value={progress?.remainingDays ?? PRACTICE_REQUIRED_DAYS}
            suffix="天"
            tone={progress && progress.remainingDays > 0 ? 'warning' : 'success'}
          />
        </Col>
      </Row>

      <Card title="政策要求达成进度">
        {progressQuery.isLoading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <Flex vertical gap={10}>
            <Progress
              percent={Math.min(100, Math.round(rate * 1000) / 10)}
              status={rate >= 1 ? 'success' : 'active'}
              strokeColor={rate >= 1 ? '#16a34a' : '#d97706'}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              近 {PRACTICE_WINDOW_YEARS} 年累计 {progress?.accumulatedDays ?? 0} 天 / 要求{' '}
              {progress?.requiredDays ?? PRACTICE_REQUIRED_DAYS} 天
              {progress && progress.remainingDays > 0
                ? `，还需 ${progress.remainingDays} 天`
                : '，已满足政策要求'}
            </Typography.Text>
          </Flex>
        )}
      </Card>

      <Card title="实践经历明细">
        <Table<EnterprisePractice>
          rowKey="id"
          size="middle"
          loading={progressQuery.isLoading}
          dataSource={progress?.records ?? []}
          columns={columns}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title="登记实践经历"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        confirmLoading={createMutation.isPending}
        okText="保存"
        cancelText="取消"
        width={620}
        destroyOnHidden
      >
        <Form<PracticeFormValues> form={form} layout="vertical">
          <Form.Item
            name="company"
            label="企业名称"
            rules={[
              { required: true, message: '请填写企业名称' },
              { min: 2, message: '企业名称至少 2 个字' },
            ]}
          >
            <Input placeholder="例如 宁波海天精工股份有限公司" />
          </Form.Item>
          <Form.Item name="position" label="实践岗位" rules={[{ required: true, message: '请填写实践岗位' }]}>
            <Input placeholder="例如 数控工艺工程师" />
          </Form.Item>
          <Form.Item name="range" label="实践起止日期" rules={[{ required: true, message: '请选择实践起止日期' }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} placeholder={['开始日期', '结束日期']} />
          </Form.Item>
          <Form.Item
            label="实践天数"
            extra="留空则按起止日期（含首尾）自动计算；如实践非连续，可手工填写实际天数"
          >
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="days" noStyle>
                <InputNumber min={1} max={1000} style={{ width: '100%' }} placeholder="选填" />
              </Form.Item>
              <Space.Addon>天</Space.Addon>
            </Space.Compact>
          </Form.Item>
          <Form.Item name="description" label="实践内容">
            <Input.TextArea rows={3} placeholder="例如 参与加工中心工艺编制与夹具设计，形成教学案例 2 个" />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  )
}

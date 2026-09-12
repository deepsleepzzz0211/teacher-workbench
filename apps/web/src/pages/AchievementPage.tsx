import { useMemo, useState } from 'react'

import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
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
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_CATEGORY_LABELS,
  type Achievement,
  type AchievementCategory,
  type AchievementCreateInput,
  ACHIEVEMENT_LEVEL_LABELS,
  ACHIEVEMENT_LEVEL_POINTS,
  ACHIEVEMENT_LEVELS,
  type AchievementLevel,
  type AchievementUpdateInput,
} from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { achievementApi } from '@/api/endpoints'
import { EChart } from '@/components/EChart'
import { PageHeader, StatCard } from '@/components/PageHeader'
import { type Columns, FormModal, StatRow, useConfirmDelete } from '@/components/blocks'
import { LevelTag } from '@/components/tags'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { formatDate } from '@/utils/format'
import { palette } from '@/theme'

const CATEGORY_OPTIONS = ACHIEVEMENT_CATEGORIES.map((value) => ({
  label: ACHIEVEMENT_CATEGORY_LABELS[value],
  value,
}))
const LEVEL_OPTIONS = ACHIEVEMENT_LEVELS.map((value) => ({
  label: ACHIEVEMENT_LEVEL_LABELS[value],
  value,
}))

interface AchievementFormValues {
  category: AchievementCategory
  title: string
  level: AchievementLevel
  role: string
  achievedOn: Dayjs
  score?: number
  description?: string
}

export function AchievementPage(): React.ReactNode {
  const { message } = AntApp.useApp()
  const confirmDelete = useConfirmDelete()
  const queryClient = useQueryClient()

  const [category, setCategory] = useState<AchievementCategory | undefined>(undefined)
  const [level, setLevel] = useState<AchievementLevel | undefined>(undefined)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Achievement | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<AchievementLevel>('provincial')
  const [form] = Form.useForm<AchievementFormValues>()
  const guard = useUnsavedChanges(form)

  const listQuery = useQuery({
    queryKey: ['achievements', 'list', category, level, range?.[0]?.format('YYYY-MM-DD'), range?.[1]?.format('YYYY-MM-DD'), page, pageSize],
    queryFn: () =>
      achievementApi.list({
        category,
        level,
        from: range?.[0]?.format('YYYY-MM-DD'),
        to: range?.[1]?.format('YYYY-MM-DD'),
        page,
        pageSize,
      }),
  })

  const statsQuery = useQuery({
    queryKey: ['achievements', 'stats'],
    queryFn: achievementApi.stats,
  })

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['achievements'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: achievementApi.create,
    onSuccess: () => {
      message.success('成果已登记')
      setModalOpen(false)
      invalidate()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AchievementUpdateInput }) =>
      achievementApi.update(id, payload),
    onSuccess: () => {
      message.success('成果已更新')
      setModalOpen(false)
      invalidate()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const removeMutation = useMutation({
    mutationFn: achievementApi.remove,
    onSuccess: () => {
      message.success('成果已删除')
      invalidate()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const stats = statsQuery.data

  const categoryOption = useMemo(() => {
    const entries = Object.entries(stats?.byCategory ?? {}).filter(([, count]) => count > 0)
    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: entries.map(([key]) => ACHIEVEMENT_CATEGORY_LABELS[key as AchievementCategory]),
        axisLabel: { fontSize: 11, interval: 0 },
      },
      yAxis: { type: 'value' as const, minInterval: 1, splitLine: { lineStyle: { type: 'dashed' as const } } },
      series: [
        {
          type: 'bar' as const,
          barWidth: 28,
          itemStyle: { color: palette.primary, borderRadius: [6, 6, 0, 0] },
          data: entries.map(([, count]) => count),
        },
      ],
    }
  }, [stats])

  const levelOption = useMemo(() => {
    const entries = Object.entries(stats?.byLevel ?? {}).filter(([, count]) => count > 0)
    return {
      tooltip: { trigger: 'item' as const },
      legend: { bottom: 0, icon: 'circle' },
      series: [
        {
          type: 'pie' as const,
          radius: ['42%', '68%'],
          center: ['50%', '44%'],
          itemStyle: { borderColor: palette.surface, borderWidth: 2 },
          label: { formatter: '{b}: {c}' },
          data: entries.map(([key, count]) => ({
            name: ACHIEVEMENT_LEVEL_LABELS[key as AchievementLevel],
            value: count,
          })),
        },
      ],
    }
  }, [stats])

  const openCreate = (): void => {
    setEditing(null)
    setSelectedLevel('provincial')
    form.resetFields()
    form.setFieldsValue({
      category: 'paper',
      level: 'provincial',
      achievedOn: dayjs(),
      role: '',
      description: '',
    })
    setModalOpen(true)
  }

  const openEdit = (record: Achievement): void => {
    setEditing(record)
    setSelectedLevel(record.level)
    form.setFieldsValue({
      category: record.category,
      title: record.title,
      level: record.level,
      role: record.role,
      achievedOn: dayjs(record.achievedOn),
      score: record.score,
      description: record.description,
    })
    setModalOpen(true)
  }

  const submit = async (): Promise<void> => {
    const values = await form.validateFields()
    const payload: AchievementCreateInput = {
      category: values.category,
      title: values.title,
      level: values.level,
      role: values.role,
      achievedOn: values.achievedOn.format('YYYY-MM-DD'),
      score: values.score,
      description: values.description ?? '',
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload })
      return
    }
    createMutation.mutate(payload)
  }

  const confirmRemove = (record: Achievement): void => {
    confirmDelete({
      title: '删除成果记录',
      content: `确定删除「${record.title}」吗？该操作不可撤销。`,
      onConfirm: () => removeMutation.mutateAsync(record.id),
    })
  }

  const columns: Columns<Achievement> = [
    {
      title: '成果类别',
      dataIndex: 'category',
      width: 120,
      render: (value: AchievementCategory) => <Tag color="blue">{ACHIEVEMENT_CATEGORY_LABELS[value]}</Tag>,
    },
    {
      title: '成果名称',
      dataIndex: 'title',
      ellipsis: { showTitle: false },
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Text strong>{value}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      width: 100,
      render: (value: AchievementLevel) => (
        <LevelTag level={value} label={ACHIEVEMENT_LEVEL_LABELS[value]} />
      ),
    },
    { title: '本人角色', dataIndex: 'role', width: 120 },
    {
      title: '取得日期',
      dataIndex: 'achievedOn',
      width: 120,
      render: (value: string) => formatDate(value),
    },
    {
      title: '分值',
      dataIndex: 'score',
      width: 90,
      align: 'right',
      render: (value: number) => <Typography.Text strong>{value} 分</Typography.Text>,
    },
    {
      title: '说明',
      dataIndex: 'description',
      ellipsis: true,
      render: (value: string) => value || '—',
    },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => confirmRemove(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  if (listQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="成果数据加载失败"
        description={getErrorMessage(listQuery.error)}
      />
    )
  }

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title="教科研成果"
        description="论文、课题、竞赛、专利、教材、培训六类成果统一登记；未填写分值时按级别自动折算，材料一次录入、随时可导出"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            登记新成果
          </Button>
        }
      />

      <StatRow>
        <StatCard title="成果总数" value={stats?.total ?? 0} suffix="项" tone="primary" />
        <StatCard title="业绩总分" value={stats?.scoreSum ?? 0} suffix="分" tone="success" />
        <StatCard title="国家级及以上" value={stats?.byLevel.national ?? 0} suffix="项" />
        <StatCard title="省级" value={stats?.byLevel.provincial ?? 0} suffix="项" />
      </StatRow>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="按类别分布">
            {statsQuery.isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : <EChart option={categoryOption} height={260} />}
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="按级别分布">
            {statsQuery.isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : <EChart option={levelOption} height={260} />}
          </Card>
        </Col>
      </Row>

      <Card>
        <Flex gap={12} wrap align="center">
          <Select
            allowClear
            placeholder="成果类别"
            style={{ width: 160 }}
            value={category}
            onChange={(value) => {
              setCategory(value)
              setPage(1)
            }}
            options={CATEGORY_OPTIONS}
          />
          <Select
            allowClear
            placeholder="成果级别"
            style={{ width: 140 }}
            value={level}
            onChange={(value) => {
              setLevel(value)
              setPage(1)
            }}
            options={LEVEL_OPTIONS}
          />
          <DatePicker.RangePicker
            value={range}
            onChange={(value) => {
              setRange(value as [Dayjs, Dayjs] | null)
              setPage(1)
            }}
            placeholder={['开始日期', '结束日期']}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setCategory(undefined)
              setLevel(undefined)
              setRange(null)
              setPage(1)
            }}
          >
            重置
          </Button>
        </Flex>
      </Card>

      <Card title="成果清单">
        <Table<Achievement>
          rowKey="id"
          size="middle"
          loading={listQuery.isLoading}
          dataSource={listQuery.data?.items ?? []}
          columns={columns}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total: listQuery.data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 项成果`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
            },
          }}
        />
      </Card>

      <FormModal
        title={editing ? '编辑成果' : '登记新成果'}
        open={modalOpen}
        onClose={() => guard.requestClose(() => setModalOpen(false))}
        onSubmit={submit}
        submitting={createMutation.isPending || updateMutation.isPending}
        width={640}
        form={form}
        onValuesChange={(changed) => {
          if (changed.level) setSelectedLevel(changed.level)
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="category" label="成果类别" rules={[{ required: true, message: '请选择成果类别' }]}>
              <Select options={CATEGORY_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="level" label="成果级别" rules={[{ required: true, message: '请选择成果级别' }]}>
              <Select options={LEVEL_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="title"
              label="成果名称"
              rules={[
                { required: true, message: '请填写成果名称' },
                { min: 2, message: '成果名称至少 2 个字' },
              ]}
            >
              <Input placeholder="例如 产教融合背景下高职数控专业课程改革实践" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="role" label="本人角色" rules={[{ required: true, message: '请填写本人角色' }]}>
              <Input placeholder="主持人 / 第一作者" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="achievedOn" label="取得日期" rules={[{ required: true, message: '请选择取得日期' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="score"
              label="自评分值"
              extra={`留空则按级别自动折算：${ACHIEVEMENT_LEVEL_LABELS[selectedLevel]} ${ACHIEVEMENT_LEVEL_POINTS[selectedLevel]} 分`}
            >
              <InputNumber min={0} max={500} style={{ width: '100%' }} placeholder="选填" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="description" label="说明">
              <Input.TextArea rows={3} placeholder="例如 发表期刊、立项单位、佐证材料位置等" />
            </Form.Item>
          </Col>
        </Row>
      </FormModal>

      {guard.confirmNode}
    </Flex>
  )
}

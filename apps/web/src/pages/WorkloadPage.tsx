import { useMemo, useState } from 'react'

import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popover,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { TableProps } from 'antd'
import dayjs from 'dayjs'

import {
  calcItemHours,
  calcTaskEffectiveHours,
  COURSE_TYPE_COEFFICIENTS,
  COURSE_TYPE_LABELS,
  type CourseType,
  explainTaskCalculation,
  MAX_WEEKS,
  TERM_REQUIRED_HOURS,
  type TeachingTask,
  WEEK_PARITIES,
  WEEKDAY_LABELS,
  WEEK_PARITY_LABELS,
  WORKLOAD_ITEM_CATEGORIES,
  WORKLOAD_ITEM_RULES,
  type WorkloadItem,
  type WorkloadItemCategory,
} from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { catalogApi, workloadApi } from '@/api/endpoints'
import { EChart } from '@/components/EChart'
import { PageHeader, StatCard } from '@/components/PageHeader'

type Columns<T> = NonNullable<TableProps<T>['columns']>

const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, index) => ({ label, value: index + 1 }))
const PARITY_OPTIONS = WEEK_PARITIES.map((value) => ({ label: WEEK_PARITY_LABELS[value], value }))
const COURSE_TYPE_OPTIONS = (Object.keys(COURSE_TYPE_LABELS) as CourseType[]).map((value) => ({
  label: COURSE_TYPE_LABELS[value],
  value,
}))
const ITEM_CATEGORY_OPTIONS = WORKLOAD_ITEM_CATEGORIES.map((value) => ({
  label: WORKLOAD_ITEM_RULES[value].label,
  value,
}))

const WEEK_OPTIONS = Array.from({ length: MAX_WEEKS }, (_, index) => ({
  label: `第 ${index + 1} 周`,
  value: index + 1,
}))

interface TaskFormValues {
  termId: string
  courseId: string
  classId: string
  location?: string
  weekday: number
  startSection: number
  endSection: number
  weekStart: number
  weekEnd: number
  weekParity: 'all' | 'odd' | 'even'
  totalHours: number
  studentCount: number
  repeatIndex: number
  remark?: string
}

interface ItemFormValues {
  termId: string
  category: WorkloadItemCategory
  title: string
  quantity: number
  occurredOn: dayjs.Dayjs
  remark?: string
}

interface TaskPreview {
  totalHours: number
  courseType: CourseType
  studentCount: number
  repeatIndex: number
}

const EMPTY_TASK_PREVIEW: TaskPreview = {
  totalHours: 0,
  courseType: 'theory',
  studentCount: 0,
  repeatIndex: 1,
}

export function WorkloadPage(): React.ReactNode {
  const { message, modal } = AntApp.useApp()
  const queryClient = useQueryClient()

  const [selectedTermId, setSelectedTermId] = useState<string | undefined>(undefined)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TeachingTask | null>(null)
  const [taskPreview, setTaskPreview] = useState<TaskPreview>(EMPTY_TASK_PREVIEW)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [itemPreview, setItemPreview] = useState<{ category: WorkloadItemCategory; quantity: number }>({
    category: 'competition_guide',
    quantity: 0,
  })

  const [taskForm] = Form.useForm<TaskFormValues>()
  const [itemForm] = Form.useForm<ItemFormValues>()

  const termsQuery = useQuery({ queryKey: ['catalog', 'terms'], queryFn: catalogApi.terms })
  const coursesQuery = useQuery({ queryKey: ['catalog', 'courses'], queryFn: catalogApi.courses })
  const classesQuery = useQuery({ queryKey: ['catalog', 'classes'], queryFn: catalogApi.classes })

  const termId = selectedTermId ?? termsQuery.data?.find((term) => term.isCurrent)?.id
  const courses = coursesQuery.data ?? []
  const classes = classesQuery.data ?? []

  const summaryQuery = useQuery({
    queryKey: ['workload', 'summary', termId],
    queryFn: () => workloadApi.summary(termId),
    enabled: Boolean(termId),
  })
  const tasksQuery = useQuery({
    queryKey: ['workload', 'tasks', termId],
    queryFn: () => workloadApi.tasks(termId),
    enabled: Boolean(termId),
  })
  const itemsQuery = useQuery({
    queryKey: ['workload', 'items', termId],
    queryFn: () => workloadApi.items(termId),
    enabled: Boolean(termId),
  })

  const invalidateWorkload = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['workload'] })
  }

  const createTask = useMutation({
    mutationFn: workloadApi.createTask,
    onSuccess: () => {
      message.success('授课任务已新增')
      setTaskModalOpen(false)
      invalidateWorkload()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const updateTask = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TaskFormValues> }) =>
      workloadApi.updateTask(id, payload),
    onSuccess: () => {
      message.success('授课任务已更新')
      setTaskModalOpen(false)
      invalidateWorkload()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const deleteTask = useMutation({
    mutationFn: workloadApi.deleteTask,
    onSuccess: () => {
      message.success('授课任务已删除')
      invalidateWorkload()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const createItem = useMutation({
    mutationFn: workloadApi.createItem,
    onSuccess: () => {
      message.success('工作量记录已新增')
      setItemModalOpen(false)
      invalidateWorkload()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const deleteItem = useMutation({
    mutationFn: workloadApi.deleteItem,
    onSuccess: () => {
      message.success('工作量记录已删除')
      invalidateWorkload()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const summary = summaryQuery.data
  const tasks = tasksQuery.data ?? []
  const items = itemsQuery.data ?? []

  const weeklyOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      grid: { left: 8, right: 16, top: 20, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: (summary?.weekly ?? []).map((entry) => `第${entry.week}周`),
        axisLabel: { fontSize: 10, interval: 1 },
      },
      yAxis: { type: 'value' as const, name: '学时', splitLine: { lineStyle: { type: 'dashed' as const } } },
      series: [
        {
          type: 'bar' as const,
          data: (summary?.weekly ?? []).map((entry) => entry.hours),
          itemStyle: { color: '#1d4ed8', borderRadius: [4, 4, 0, 0] },
        },
      ],
    }),
    [summary],
  )

  const courseTypeOption = useMemo(() => {
    const entries = Object.entries(summary?.byCourseType ?? {}).filter(([, hours]) => hours > 0)
    return {
      tooltip: { trigger: 'item' as const },
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: entries.map(([type]) => COURSE_TYPE_LABELS[type as CourseType]),
        axisLabel: { fontSize: 11 },
      },
      yAxis: { type: 'value' as const, name: '学时', splitLine: { lineStyle: { type: 'dashed' as const } } },
      series: [
        {
          type: 'bar' as const,
          barWidth: 36,
          data: entries.map(([, hours]) => hours),
          itemStyle: { color: '#0ea5e9', borderRadius: [6, 6, 0, 0] },
        },
      ],
    }
  }, [summary])

  const openCreateTask = (): void => {
    setEditingTask(null)
    setTaskPreview(EMPTY_TASK_PREVIEW)
    taskForm.resetFields()
    taskForm.setFieldsValue({
      termId,
      weekday: 1,
      startSection: 1,
      endSection: 2,
      weekStart: 1,
      weekEnd: 18,
      weekParity: 'all',
      repeatIndex: 1,
      location: '',
      remark: '',
    })
    setTaskModalOpen(true)
  }

  const openEditTask = (task: TeachingTask): void => {
    setEditingTask(task)
    setTaskPreview({
      totalHours: task.totalHours,
      courseType: task.courseType,
      studentCount: task.studentCount,
      repeatIndex: task.repeatIndex,
    })
    taskForm.setFieldsValue({
      termId: task.termId,
      courseId: task.courseId,
      classId: task.classId,
      location: task.location,
      weekday: task.weekday,
      startSection: task.startSection,
      endSection: task.endSection,
      weekStart: task.weekStart,
      weekEnd: task.weekEnd,
      weekParity: task.weekParity,
      totalHours: task.totalHours,
      studentCount: task.studentCount,
      repeatIndex: task.repeatIndex,
      remark: task.remark,
    })
    setTaskModalOpen(true)
  }

  const handleTaskValuesChange = (changed: Partial<TaskFormValues>, all: TaskFormValues): void => {
    const courseId = changed.courseId ?? all.courseId
    const classId = changed.classId ?? all.classId
    const course = courses.find((item) => item.id === courseId)
    const group = classes.find((item) => item.id === classId)

    const autoHours = changed.courseId ? course?.hours : undefined
    if (autoHours !== undefined) taskForm.setFieldValue('totalHours', autoHours)

    const autoStudentCount = changed.classId ? group?.studentCount : undefined
    if (autoStudentCount !== undefined) taskForm.setFieldValue('studentCount', autoStudentCount)

    setTaskPreview({
      totalHours: Number(changed.totalHours ?? autoHours ?? all.totalHours) || 0,
      courseType: course?.courseType ?? 'theory',
      studentCount: Number(changed.studentCount ?? autoStudentCount ?? all.studentCount) || 0,
      repeatIndex: Number(changed.repeatIndex ?? all.repeatIndex) || 1,
    })
  }

  const submitTask = async (): Promise<void> => {
    const values = await taskForm.validateFields()
    const payload = {
      termId: values.termId,
      courseId: values.courseId,
      classId: values.classId,
      location: values.location ?? '',
      weekday: values.weekday,
      startSection: values.startSection,
      endSection: values.endSection,
      weekStart: values.weekStart,
      weekEnd: values.weekEnd,
      weekParity: values.weekParity,
      totalHours: values.totalHours,
      studentCount: values.studentCount,
      repeatIndex: values.repeatIndex ?? 1,
      remark: values.remark ?? '',
    }

    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, payload })
      return
    }
    createTask.mutate(payload)
  }

  const submitItem = async (): Promise<void> => {
    const values = await itemForm.validateFields()
    createItem.mutate({
      termId: values.termId,
      category: values.category,
      title: values.title,
      quantity: values.quantity,
      occurredOn: values.occurredOn.format('YYYY-MM-DD'),
      remark: values.remark ?? '',
    })
  }

  const confirmDeleteTask = (task: TeachingTask): void => {
    modal.confirm({
      title: '删除授课任务',
      content: `确定删除「${task.courseName} · ${task.className}」吗？删除后该记录的折算学时将从汇总中移除。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteTask.mutateAsync(task.id),
    })
  }

  const confirmDeleteItem = (item: WorkloadItem): void => {
    modal.confirm({
      title: '删除工作量记录',
      content: `确定删除「${item.title}」吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteItem.mutateAsync(item.id),
    })
  }

  const taskColumns: Columns<TeachingTask> = [
    { title: '课程名称', dataIndex: 'courseName', width: 180, fixed: 'left' },
    {
      title: '课程类型',
      dataIndex: 'courseType',
      width: 110,
      render: (value: CourseType) => <Tag color="blue">{COURSE_TYPE_LABELS[value]}</Tag>,
    },
    { title: '授课班级', dataIndex: 'className', width: 190 },
    { title: '人数', dataIndex: 'studentCount', width: 72, align: 'right' },
    {
      title: '上课时间',
      key: 'slot',
      width: 150,
      render: (_, task) =>
        `${WEEKDAY_LABELS[task.weekday - 1] ?? ''} 第 ${task.startSection}-${task.endSection} 节`,
    },
    {
      title: '周次',
      key: 'weeks',
      width: 120,
      render: (_, task) =>
        `${task.weekStart}-${task.weekEnd} 周 · ${WEEK_PARITY_LABELS[task.weekParity]}`,
    },
    { title: '地点', dataIndex: 'location', width: 140, render: (value: string) => value || '—' },
    { title: '总学时', dataIndex: 'totalHours', width: 88, align: 'right' },
    {
      title: '折算学时',
      dataIndex: 'effectiveHours',
      width: 100,
      align: 'right',
      render: (value: number) => <Typography.Text strong>{value.toFixed(1)}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      fixed: 'right',
      render: (_, task) => {
        const detail = explainTaskCalculation({
          totalHours: task.totalHours,
          courseType: task.courseType,
          studentCount: task.studentCount,
          repeatIndex: task.repeatIndex,
        })
        return (
          <Flex gap={4}>
            <Popover
              title="折算过程"
              content={
                <div style={{ lineHeight: 1.9, fontSize: 12 }}>
                  <div>
                    总学时：{detail.totalHours} 学时
                  </div>
                  <div>
                    课程类型系数：{detail.typeCoefficient.toFixed(2)}（{COURSE_TYPE_LABELS[task.courseType]}）
                  </div>
                  <div>
                    班级规模系数：{detail.classSizeFactor.toFixed(2)}（{task.studentCount} 人）
                  </div>
                  <div>
                    重复课系数：{detail.repeatFactor.toFixed(2)}
                    {task.repeatIndex > 1 ? `（第 ${task.repeatIndex} 次授课）` : '（首次授课）'}
                  </div>
                  <Divider style={{ margin: '6px 0' }} />
                  <div>
                    折算学时 = {detail.totalHours} × {detail.typeCoefficient.toFixed(2)} ×{' '}
                    {detail.classSizeFactor.toFixed(2)} × {detail.repeatFactor.toFixed(2)} ={' '}
                    <strong>{detail.effectiveHours} 学时</strong>
                  </div>
                </div>
              }
            >
              <Button size="small" type="link">
                规则
              </Button>
            </Popover>
            <Button size="small" type="link" onClick={() => openEditTask(task)}>
              编辑
            </Button>
            <Button size="small" type="link" danger onClick={() => confirmDeleteTask(task)}>
              删除
            </Button>
          </Flex>
        )
      },
    },
  ]

  const itemColumns: Columns<WorkloadItem> = [
    {
      title: '类别',
      dataIndex: 'category',
      width: 150,
      render: (value: WorkloadItemCategory) => <Tag>{WORKLOAD_ITEM_RULES[value].label}</Tag>,
    },
    { title: '工作内容', dataIndex: 'title' },
    { title: '数量', dataIndex: 'quantity', width: 90, align: 'right' },
    {
      title: '单位',
      dataIndex: 'category',
      width: 110,
      render: (value: WorkloadItemCategory) => WORKLOAD_ITEM_RULES[value].unit,
    },
    {
      title: '折算学时',
      dataIndex: 'hours',
      width: 100,
      align: 'right',
      render: (value: number) => <Typography.Text strong>{value.toFixed(1)}</Typography.Text>,
    },
    { title: '发生日期', dataIndex: 'occurredOn', width: 120 },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_, item) => (
        <Button size="small" type="link" danger onClick={() => confirmDeleteItem(item)}>
          删除
        </Button>
      ),
    },
  ]

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

  const rate = summary?.achievementRate ?? 0
  const overHours = summary ? Math.max(0, summary.totalHours - summary.requiredHours) : 0

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title="教学工作量"
        description="折算学时 = 总学时 × 课程类型系数 × 班级规模系数 × 重复课系数（理论 1.0 / 理实一体 1.1 / 实训 1.2 / 顶岗实习 1.5；超过 40 人每多 1 人 +1%，上限 1.3；同一课程第 2 次起按 0.9）"
        extra={
          <Select
            style={{ width: 240 }}
            value={termId}
            onChange={setSelectedTermId}
            options={(termsQuery.data ?? []).map((term) => ({ label: term.name, value: term.id }))}
            placeholder="选择学期"
          />
        }
      />

      {summaryQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="工作量汇总加载失败"
          description={getErrorMessage(summaryQuery.error)}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="总折算学时"
            value={(summary?.totalHours ?? 0).toFixed(1)}
            suffix="学时"
            tone="primary"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="课堂教学" value={(summary?.taskHours ?? 0).toFixed(1)} suffix="学时" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="其它工作量" value={(summary?.itemHours ?? 0).toFixed(1)} suffix="学时" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="达成率"
            value={`${(rate * 100).toFixed(1)}%`}
            tone={rate >= 1 ? 'success' : 'warning'}
            status={rate >= 1 ? <Tag color="success">已达标</Tag> : <Tag color="warning">待完成</Tag>}
            hint={`总计 ${(summary?.totalHours ?? 0).toFixed(1)} / ${summary?.requiredHours ?? TERM_REQUIRED_HOURS} 学时`}
          />
        </Col>
      </Row>

      <Card>
        {summaryQuery.isLoading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <Flex vertical gap={8}>
            <Flex justify="space-between">
              <Typography.Text type="secondary">
                折算学时 / 学期基本工作量（{summary?.requiredHours ?? TERM_REQUIRED_HOURS} 学时）
              </Typography.Text>
              <Typography.Text strong>
                {(summary?.totalHours ?? 0).toFixed(1)} / {summary?.requiredHours ?? TERM_REQUIRED_HOURS}
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
                : `距离基本工作量还差 ${((summary?.requiredHours ?? TERM_REQUIRED_HOURS) - (summary?.totalHours ?? 0)).toFixed(1)} 折算学时`}
            </Typography.Text>
          </Flex>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="周学时分布">
            {summaryQuery.isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : <EChart option={weeklyOption} height={260} />}
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="课程类型构成">
            {summaryQuery.isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : <EChart option={courseTypeOption} height={260} />}
          </Card>
        </Col>
      </Row>

      <Card
        title="授课任务"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTask}>
            新增授课任务
          </Button>
        }
      >
        <Table<TeachingTask>
          rowKey="id"
          size="middle"
          loading={tasksQuery.isLoading}
          dataSource={tasks}
          columns={taskColumns}
          pagination={false}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Card
        title="其它工作量"
        extra={
          <Button
            type="primary"
            ghost
            icon={<PlusOutlined />}
            onClick={() => {
              itemForm.resetFields()
              itemForm.setFieldsValue({
                termId,
                category: 'competition_guide',
                quantity: 1,
                occurredOn: dayjs(),
                remark: '',
              })
              setItemPreview({ category: 'competition_guide', quantity: 1 })
              setItemModalOpen(true)
            }}
          >
            新增其它工作量
          </Button>
        }
      >
        <Table<WorkloadItem>
          rowKey="id"
          size="middle"
          loading={itemsQuery.isLoading}
          dataSource={items}
          columns={itemColumns}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={editingTask ? '编辑授课任务' : '新增授课任务'}
        open={taskModalOpen}
        onCancel={() => setTaskModalOpen(false)}
        onOk={submitTask}
        confirmLoading={createTask.isPending || updateTask.isPending}
        okText="保存"
        cancelText="取消"
        width={760}
        destroyOnHidden
      >
        <Form<TaskFormValues>
          form={taskForm}
          layout="vertical"
          onValuesChange={handleTaskValuesChange}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="termId" label="学期" rules={[{ required: true, message: '请选择学期' }]}>
                <Select
                  options={(termsQuery.data ?? []).map((term) => ({ label: term.name, value: term.id }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="courseId" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择课程（自动带出学时）"
                  options={courses.map((course) => ({
                    label: `${course.name}（${course.code} · ${COURSE_TYPE_LABELS[course.courseType]}）`,
                    value: course.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="classId" label="授课班级" rules={[{ required: true, message: '请选择班级' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择班级（自动带出人数）"
                  options={classes.map((group) => ({
                    label: `${group.name}（${group.studentCount} 人）`,
                    value: group.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="上课地点">
                <Input placeholder="例如 A101 制图室" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="weekday" label="星期" rules={[{ required: true, message: '请选择星期' }]}>
                <Select options={WEEKDAY_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="startSection"
                label="开始节次"
                rules={[{ required: true, message: '请填写开始节次' }]}
              >
                <InputNumber min={1} max={12} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="endSection"
                label="结束节次"
                dependencies={['startSection']}
                rules={[
                  { required: true, message: '请填写结束节次' },
                  ({ getFieldValue }) => ({
                    validator: (_rule, value: number) =>
                      !value || value >= getFieldValue('startSection')
                        ? Promise.resolve()
                        : Promise.reject(new Error('结束节次不能早于开始节次')),
                  }),
                ]}
              >
                <InputNumber min={1} max={12} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="weekStart" label="起始周" rules={[{ required: true, message: '请填写起始周' }]}>
                <InputNumber min={1} max={MAX_WEEKS} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="weekEnd"
                label="结束周"
                dependencies={['weekStart']}
                rules={[
                  { required: true, message: '请填写结束周' },
                  ({ getFieldValue }) => ({
                    validator: (_rule, value: number) =>
                      !value || value >= getFieldValue('weekStart')
                        ? Promise.resolve()
                        : Promise.reject(new Error('结束周次不能早于开始周次')),
                  }),
                ]}
              >
                <InputNumber min={1} max={MAX_WEEKS} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="weekParity" label="单双周" rules={[{ required: true, message: '请选择单双周' }]}>
                <Select options={PARITY_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="totalHours"
                label="总学时"
                rules={[{ required: true, message: '请填写总学时' }]}
              >
                <InputNumber min={0.5} max={2000} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="studentCount"
                label="班级人数"
                rules={[{ required: true, message: '请填写班级人数' }]}
              >
                <InputNumber min={1} max={300} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="repeatIndex"
                label="重复课次序"
                tooltip="同一学期同一课程第几次授课，第 2 次起按 0.9 折算"
                rules={[{ required: true, message: '请填写重复课次序' }]}
              >
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="remark" label="备注">
                <Input placeholder="选填，例如 合班教学、单周上课等" />
              </Form.Item>
            </Col>
          </Row>

          <TaskPreviewBox preview={taskPreview} />
        </Form>
      </Modal>

      <Modal
        title="新增其它工作量"
        open={itemModalOpen}
        onCancel={() => setItemModalOpen(false)}
        onOk={submitItem}
        confirmLoading={createItem.isPending}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form<ItemFormValues>
          form={itemForm}
          layout="vertical"
          onValuesChange={(_changed, all) =>
            setItemPreview({
              category: all.category ?? 'competition_guide',
              quantity: Number(all.quantity) || 0,
            })
          }
        >
          <Form.Item name="termId" label="学期" rules={[{ required: true, message: '请选择学期' }]}>
            <Select options={(termsQuery.data ?? []).map((term) => ({ label: term.name, value: term.id }))} />
          </Form.Item>
          <Form.Item name="category" label="类别" rules={[{ required: true, message: '请选择类别' }]}>
            <Select options={ITEM_CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item name="title" label="工作内容" rules={[{ required: true, message: '请填写工作内容' }]}>
            <Input placeholder="例如 2026年省职业院校技能大赛指导" />
          </Form.Item>
          <Form.Item label="数量" required>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="quantity"
                noStyle
                rules={[{ required: true, message: '请填写数量' }]}
              >
                <InputNumber min={0.5} max={10000} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
              <Space.Addon>{WORKLOAD_ITEM_RULES[itemPreview.category].unit}</Space.Addon>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            name="occurredOn"
            label="发生日期"
            rules={[{ required: true, message: '请选择发生日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input />
          </Form.Item>

          <Card size="small" style={{ background: '#f8fafc' }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              折算规则
            </Typography.Text>
            <div style={{ marginTop: 6 }}>
              数量 {itemPreview.quantity || 0} {WORKLOAD_ITEM_RULES[itemPreview.category].unit} × 系数{' '}
              {WORKLOAD_ITEM_RULES[itemPreview.category].hoursPerUnit} ={' '}
              <Typography.Text strong>
                {calcItemHours({
                  category: itemPreview.category,
                  quantity: itemPreview.quantity,
                }).toFixed(1)}{' '}
                折算学时
              </Typography.Text>
            </div>
          </Card>
        </Form>
      </Modal>
    </Flex>
  )
}

function TaskPreviewBox({ preview }: { preview: TaskPreview }): React.ReactNode {
  const effectiveHours = calcTaskEffectiveHours({
    totalHours: preview.totalHours,
    courseType: preview.courseType,
    studentCount: preview.studentCount,
    repeatIndex: preview.repeatIndex,
  })
  const detail = explainTaskCalculation({
    totalHours: preview.totalHours,
    courseType: preview.courseType,
    studentCount: preview.studentCount,
    repeatIndex: preview.repeatIndex,
  })
  const baseCoefficient = COURSE_TYPE_COEFFICIENTS[preview.courseType]

  return (
    <Card size="small" style={{ background: '#f8fafc', borderColor: '#dbeafe' }}>
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          折算预览
        </Typography.Text>
        <Typography.Text strong style={{ fontSize: 16, color: '#1d4ed8' }}>
          {effectiveHours.toFixed(1)} 折算学时
        </Typography.Text>
      </Flex>
      <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.9, color: '#475569' }}>
        {detail.totalHours || 0} 学时 × {baseCoefficient.toFixed(2)}（{COURSE_TYPE_LABELS[preview.courseType]}）×{' '}
        {detail.classSizeFactor.toFixed(2)}（{preview.studentCount || 0} 人）×{' '}
        {detail.repeatFactor.toFixed(2)}（
        {preview.repeatIndex > 1 ? `第 ${preview.repeatIndex} 次授课` : '首次授课'}）
      </div>
    </Card>
  )
}

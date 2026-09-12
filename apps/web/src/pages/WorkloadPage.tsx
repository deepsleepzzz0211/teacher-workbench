import { useMemo, useState } from 'react'

import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Progress,
  Row,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import {
  TERM_REQUIRED_HOURS,
  type TeachingTask,
  type WorkloadItem,
} from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { catalogApi, workloadApi } from '@/api/endpoints'
import { EChart } from '@/components/EChart'
import { PageHeader, StatCard } from '@/components/PageHeader'
import { StatRow, useConfirmDelete } from '@/components/blocks'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { palette } from '@/theme'

import { buildCourseTypeOption, buildWeeklyOption } from './workload/chartOptions'
import { buildItemColumns } from './workload/itemColumns'
import { ItemFormModal, type ItemPreview } from './workload/ItemFormModal'
import { TaskFormModal } from './workload/TaskFormModal'
import { buildTaskColumns } from './workload/taskColumns'
import {
  EMPTY_TASK_PREVIEW,
  type ItemFormValues,
  type TaskFormValues,
  type TaskPreview,
} from './workload/types'

export function WorkloadPage(): React.ReactNode {
  const { message } = AntApp.useApp()
  const confirmDelete = useConfirmDelete()
  const queryClient = useQueryClient()

  const [selectedTermId, setSelectedTermId] = useState<string | undefined>(undefined)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TeachingTask | null>(null)
  const [taskPreview, setTaskPreview] = useState<TaskPreview>(EMPTY_TASK_PREVIEW)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [itemPreview, setItemPreview] = useState<ItemPreview>({
    category: 'competition_guide',
    quantity: 0,
  })

  const [taskForm] = Form.useForm<TaskFormValues>()
  const [itemForm] = Form.useForm<ItemFormValues>()

  const taskGuard = useUnsavedChanges(taskForm)
  const itemGuard = useUnsavedChanges(itemForm)

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
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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

  const weeklyOption = useMemo(() => buildWeeklyOption(summary), [summary])
  const courseTypeOption = useMemo(() => buildCourseTypeOption(summary), [summary])

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
    confirmDelete({
      title: '删除授课任务',
      content: `确定删除「${task.courseName} · ${task.className}」吗？删除后该记录的折算学时将从汇总中移除。`,
      onConfirm: () => deleteTask.mutateAsync(task.id),
    })
  }

  const confirmDeleteItem = (item: WorkloadItem): void => {
    confirmDelete({
      title: '删除工作量记录',
      content: `确定删除「${item.title}」吗？`,
      onConfirm: () => deleteItem.mutateAsync(item.id),
    })
  }

  const taskColumns = buildTaskColumns({ onEdit: openEditTask, onDelete: confirmDeleteTask })
  const itemColumns = buildItemColumns({ onDelete: confirmDeleteItem })

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

      <StatRow>
        <StatCard
          title="总折算学时"
          value={(summary?.totalHours ?? 0).toFixed(1)}
          suffix="学时"
          tone="primary"
        />
        <StatCard title="课堂教学" value={(summary?.taskHours ?? 0).toFixed(1)} suffix="学时" />
        <StatCard title="其它工作量" value={(summary?.itemHours ?? 0).toFixed(1)} suffix="学时" />
        <StatCard
          title="达成率"
          value={`${(rate * 100).toFixed(1)}%`}
          tone={rate >= 1 ? 'success' : 'warning'}
          status={rate >= 1 ? <Tag color="success">已达标</Tag> : <Tag color="warning">待完成</Tag>}
          hint={`总计 ${(summary?.totalHours ?? 0).toFixed(1)} / ${summary?.requiredHours ?? TERM_REQUIRED_HOURS} 学时`}
        />
      </StatRow>

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
              strokeColor={palette.primary}
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

      <TaskFormModal
        open={taskModalOpen}
        editing={editingTask !== null}
        form={taskForm}
        preview={taskPreview}
        submitting={createTask.isPending || updateTask.isPending}
        terms={termsQuery.data ?? []}
        courses={courses}
        classes={classes}
        onClose={() => taskGuard.requestClose(() => setTaskModalOpen(false))}
        onSubmit={submitTask}
        onValuesChange={handleTaskValuesChange}
      />

      <ItemFormModal
        open={itemModalOpen}
        form={itemForm}
        preview={itemPreview}
        submitting={createItem.isPending}
        terms={termsQuery.data ?? []}
        onClose={() => itemGuard.requestClose(() => setItemModalOpen(false))}
        onSubmit={submitItem}
        onValuesChange={(_changed, all) =>
          setItemPreview({
            category: all.category ?? 'competition_guide',
            quantity: Number(all.quantity) || 0,
          })
        }
      />

      {taskGuard.confirmNode}
      {itemGuard.confirmNode}
    </Flex>
  )
}

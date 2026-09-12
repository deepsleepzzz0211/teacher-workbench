import { useMemo, useState } from 'react'

import { Alert, Flex, Form, Select, Skeleton } from 'antd'
import dayjs from 'dayjs'

import { type TeachingTask, type WorkloadItem } from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { PageHeader } from '@/components/PageHeader'
import { useConfirmDelete } from '@/components/blocks'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

import { buildCourseTypeOption, buildWeeklyOption } from './workload/chartOptions'
import { buildItemColumns } from './workload/itemColumns'
import { ItemFormModal, type ItemPreview } from './workload/ItemFormModal'
import { TaskFormModal } from './workload/TaskFormModal'
import { buildTaskColumns } from './workload/taskColumns'
import { EMPTY_TASK_PREVIEW, type ItemFormValues, type TaskFormValues, type TaskPreview } from './workload/types'
import { useWorkloadData } from './workload/useWorkloadData'
import { WorkloadSummary } from './workload/WorkloadSummary'
import { WorkloadTables } from './workload/WorkloadTables'

export function WorkloadPage(): React.ReactNode {
  const confirmDelete = useConfirmDelete()

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

  const {
    termsQuery,
    termId,
    courses,
    classes,
    summaryQuery,
    tasksQuery,
    itemsQuery,
    summary,
    tasks,
    items,
    createTask,
    updateTask,
    deleteTask,
    createItem,
    deleteItem,
  } = useWorkloadData({
    selectedTermId,
    onTaskSaved: () => setTaskModalOpen(false),
    onItemSaved: () => setItemModalOpen(false),
  })

  const weeklyOption = useMemo(() => buildWeeklyOption(summary), [summary])
  const courseTypeOption = useMemo(() => buildCourseTypeOption(summary), [summary])

  const openCreateItem = (): void => {
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
  }

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

      <WorkloadSummary
        summary={summary}
        isLoading={summaryQuery.isLoading}
        isError={summaryQuery.isError}
        error={summaryQuery.error}
        weeklyOption={weeklyOption}
        courseTypeOption={courseTypeOption}
      />

      <WorkloadTables
        tasks={tasks}
        items={items}
        tasksLoading={tasksQuery.isLoading}
        itemsLoading={itemsQuery.isLoading}
        taskColumns={taskColumns}
        itemColumns={itemColumns}
        onCreateTask={openCreateTask}
        onCreateItem={openCreateItem}
      />

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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { App as AntApp } from 'antd'

import { getErrorMessage } from '@/api/client'
import { catalogApi, workloadApi } from '@/api/endpoints'

import type { TaskFormValues } from './types'

interface UseWorkloadDataOptions {
  selectedTermId: string | undefined
  onTaskSaved: () => void
  onItemSaved: () => void
}

export function useWorkloadData({ selectedTermId, onTaskSaved, onItemSaved }: UseWorkloadDataOptions) {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

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

  const onError = (error: unknown): void => {
    message.error(getErrorMessage(error))
  }

  const createTask = useMutation({
    mutationFn: workloadApi.createTask,
    onSuccess: () => {
      message.success('授课任务已新增')
      onTaskSaved()
      invalidateWorkload()
    },
    onError,
  })

  const updateTask = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TaskFormValues> }) =>
      workloadApi.updateTask(id, payload),
    onSuccess: () => {
      message.success('授课任务已更新')
      onTaskSaved()
      invalidateWorkload()
    },
    onError,
  })

  const deleteTask = useMutation({
    mutationFn: workloadApi.deleteTask,
    onSuccess: () => {
      message.success('授课任务已删除')
      invalidateWorkload()
    },
    onError,
  })

  const createItem = useMutation({
    mutationFn: workloadApi.createItem,
    onSuccess: () => {
      message.success('工作量记录已新增')
      onItemSaved()
      invalidateWorkload()
    },
    onError,
  })

  const deleteItem = useMutation({
    mutationFn: workloadApi.deleteItem,
    onSuccess: () => {
      message.success('工作量记录已删除')
      invalidateWorkload()
    },
    onError,
  })

  return {
    termsQuery,
    termId,
    courses,
    classes,
    summaryQuery,
    tasksQuery,
    itemsQuery,
    summary: summaryQuery.data,
    tasks: tasksQuery.data ?? [],
    items: itemsQuery.data ?? [],
    createTask,
    updateTask,
    deleteTask,
    createItem,
    deleteItem,
  }
}

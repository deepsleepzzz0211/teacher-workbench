import { useMemo, useState } from 'react'

import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App as AntApp, Button, Card, Flex, Form, Table } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import {
  type Achievement,
  type AchievementCategory,
  type AchievementCreateInput,
  type AchievementLevel,
  type AchievementUpdateInput,
} from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { achievementApi } from '@/api/endpoints'
import { PageHeader } from '@/components/PageHeader'
import { useConfirmDelete } from '@/components/blocks'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

import { AchievementFilters } from './achievement/AchievementFilters'
import { AchievementFormModal } from './achievement/AchievementFormModal'
import { AchievementStats } from './achievement/AchievementStats'
import { buildCategoryOption, buildLevelOption } from './achievement/chartOptions'
import { buildAchievementColumns } from './achievement/columns'
import type { AchievementFormValues } from './achievement/types'

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

  const categoryOption = useMemo(() => buildCategoryOption(stats), [stats])
  const levelOption = useMemo(() => buildLevelOption(stats), [stats])

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

  const columns = buildAchievementColumns({ onEdit: openEdit, onDelete: confirmRemove })

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

      <AchievementStats
        total={stats?.total ?? 0}
        scoreSum={stats?.scoreSum ?? 0}
        byLevel={stats?.byLevel ?? {}}
        isLoading={statsQuery.isLoading}
        categoryOption={categoryOption}
        levelOption={levelOption}
      />

      <AchievementFilters
        category={category}
        level={level}
        range={range}
        onCategoryChange={(value) => {
          setCategory(value)
          setPage(1)
        }}
        onLevelChange={(value) => {
          setLevel(value)
          setPage(1)
        }}
        onRangeChange={(value) => {
          setRange(value as [Dayjs, Dayjs] | null)
          setPage(1)
        }}
        onReset={() => {
          setCategory(undefined)
          setLevel(undefined)
          setRange(null)
          setPage(1)
        }}
      />

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

      <AchievementFormModal
        open={modalOpen}
        editing={editing !== null}
        form={form}
        selectedLevel={selectedLevel}
        submitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => guard.requestClose(() => setModalOpen(false))}
        onSubmit={submit}
        onValuesChange={(changed) => {
          if (changed.level) setSelectedLevel(changed.level)
        }}
      />

      {guard.confirmNode}
    </Flex>
  )
}

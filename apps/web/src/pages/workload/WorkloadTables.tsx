import type { ReactNode } from 'react'

import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Table } from 'antd'

import type { TeachingTask, WorkloadItem } from '@tw/shared'

import type { Columns } from '@/components/blocks'

interface WorkloadTablesProps {
  tasks: TeachingTask[]
  items: WorkloadItem[]
  tasksLoading: boolean
  itemsLoading: boolean
  taskColumns: Columns<TeachingTask>
  itemColumns: Columns<WorkloadItem>
  onCreateTask: () => void
  onCreateItem: () => void
}

export function WorkloadTables({
  tasks,
  items,
  tasksLoading,
  itemsLoading,
  taskColumns,
  itemColumns,
  onCreateTask,
  onCreateItem,
}: WorkloadTablesProps): ReactNode {
  return (
    <>
      <Card
        title="授课任务"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreateTask}>
            新增授课任务
          </Button>
        }
      >
        <Table<TeachingTask>
          rowKey="id"
          size="middle"
          loading={tasksLoading}
          dataSource={tasks}
          columns={taskColumns}
          pagination={false}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Card
        title="其它工作量"
        extra={
          <Button type="primary" ghost icon={<PlusOutlined />} onClick={onCreateItem}>
            新增其它工作量
          </Button>
        }
      >
        <Table<WorkloadItem>
          rowKey="id"
          size="middle"
          loading={itemsLoading}
          dataSource={items}
          columns={itemColumns}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>
    </>
  )
}

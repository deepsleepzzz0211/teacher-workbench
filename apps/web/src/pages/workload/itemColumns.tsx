import { Button, Tag, Typography } from 'antd'

import { type WorkloadItem, type WorkloadItemCategory, WORKLOAD_ITEM_RULES } from '@tw/shared'

import type { Columns } from '@/components/blocks'

interface ItemColumnHandlers {
  onDelete: (item: WorkloadItem) => void
}

export function buildItemColumns({ onDelete }: ItemColumnHandlers): Columns<WorkloadItem> {
  return [
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
        <Button size="small" type="link" danger onClick={() => onDelete(item)}>
          删除
        </Button>
      ),
    },
  ]
}

import { Button, Space, Tag, Tooltip, Typography } from 'antd'

import {
  type Achievement,
  ACHIEVEMENT_CATEGORY_LABELS,
  type AchievementCategory,
  ACHIEVEMENT_LEVEL_LABELS,
  type AchievementLevel,
} from '@tw/shared'

import type { Columns } from '@/components/blocks'
import { LevelTag } from '@/components/tags'
import { formatDate } from '@/utils/format'

interface AchievementColumnHandlers {
  onEdit: (record: Achievement) => void
  onDelete: (record: Achievement) => void
}

export function buildAchievementColumns({ onEdit, onDelete }: AchievementColumnHandlers): Columns<Achievement> {
  return [
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
      render: (value: AchievementLevel) => <LevelTag level={value} label={ACHIEVEMENT_LEVEL_LABELS[value]} />,
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
          <Button type="link" size="small" onClick={() => onEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => onDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]
}

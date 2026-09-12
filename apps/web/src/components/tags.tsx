import { Tag } from 'antd'

import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type TodoPriority,
  TODO_PRIORITY_LABELS,
} from '@tw/shared'

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending: 'processing',
  approved: 'success',
  rejected: 'error',
}

export function ApplicationStatusTag({ status }: { status: ApplicationStatus }): React.ReactNode {
  return <Tag color={STATUS_COLORS[status]}>{APPLICATION_STATUS_LABELS[status]}</Tag>
}

const PRIORITY_COLORS: Record<TodoPriority, string> = {
  high: 'red',
  medium: 'orange',
  low: 'default',
}

export function TodoPriorityTag({ priority }: { priority: TodoPriority }): React.ReactNode {
  return <Tag color={PRIORITY_COLORS[priority]}>{TODO_PRIORITY_LABELS[priority]}优先级</Tag>
}

const LEVEL_COLORS: Record<string, string> = {
  national: 'magenta',
  provincial: 'volcano',
  municipal: 'blue',
  school: 'default',
}

export function LevelTag({ level, label }: { level: string; label: string }): React.ReactNode {
  return <Tag color={LEVEL_COLORS[level] ?? 'default'}>{label}</Tag>
}

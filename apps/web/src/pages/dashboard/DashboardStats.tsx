import type { ReactNode } from 'react'

import { Tag } from 'antd'

import { TERM_REQUIRED_HOURS, type DashboardOverview } from '@tw/shared'

import { StatCard } from '@/components/PageHeader'
import { StatRow } from '@/components/blocks'
import { formatPercent } from '@/utils/format'

export function DashboardStats({ data }: { data: DashboardOverview }): ReactNode {
  const workload = data.workload
  const rate = workload ? workload.achievementRate : 0

  return (
    <StatRow>
      <StatCard
        title="本学期折算学时"
        value={workload ? workload.totalHours.toFixed(1) : '0.0'}
        suffix="学时"
        tone="primary"
        hint={`基本工作量 ${TERM_REQUIRED_HOURS} 学时 · 达成 ${formatPercent(rate)}`}
        status={rate >= 1 ? <Tag color="success">已达标</Tag> : <Tag color="warning">待完成</Tag>}
      />
      <StatCard
        title="教科研成果"
        value={data.achievement.total}
        suffix="项"
        hint={`累计业绩分 ${data.achievement.scoreSum}`}
      />
      <StatCard
        title="企业实践累计"
        value={data.practice.accumulatedDays}
        suffix="天"
        tone={data.practice.rate >= 1 ? 'success' : 'warning'}
        hint={`近 5 年要求 ${data.practice.requiredDays} 天 · 还差 ${data.practice.remainingDays} 天`}
      />
      <StatCard
        title="待办事项"
        value={data.counters.pendingTodos}
        suffix="项待办"
        tone={data.counters.pendingTodos > 0 ? 'warning' : 'default'}
        hint={`未读通知 ${data.counters.unreadNotices} 条 · 待审批 ${data.counters.pendingApplications} 条`}
      />
    </StatRow>
  )
}

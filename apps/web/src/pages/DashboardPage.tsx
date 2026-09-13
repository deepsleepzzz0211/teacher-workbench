import { useQuery } from '@tanstack/react-query'
import { Alert, Flex, Row, Skeleton } from 'antd'

import { dashboardApi } from '@/api/endpoints'
import { PageHeader } from '@/components/PageHeader'

import { AchievementPanel } from './dashboard/AchievementPanel'
import { DashboardStats } from './dashboard/DashboardStats'
import { ListPanels } from './dashboard/ListPanels'
import { ProgressPanels } from './dashboard/ProgressPanels'
import { TodayAndWeekCards } from './dashboard/TodayAndWeekCards'
import { greeting } from './dashboard/greeting'

export function DashboardPage(): React.ReactNode {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.overview,
  })

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />
  }

  if (isError || !data) {
    return (
      <Alert
        type="error"
        showIcon
        message="工作台数据加载失败"
        description={error instanceof Error ? error.message : '请稍后重试'}
      />
    )
  }

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title={`${greeting()}，${data.teacher.name} 老师`}
        description={
          data.currentTerm
            ? `${data.teacher.department} · ${data.teacher.title} · ${data.currentTerm.name}（第 ${data.currentTerm.week} 教学周）`
            : `${data.teacher.department} · ${data.teacher.title}`
        }
      />

      <DashboardStats data={data} />

      <Row gutter={[16, 16]}>
        <TodayAndWeekCards data={data} />
        <ProgressPanels data={data} />
      </Row>

      <ListPanels data={data} />

      <AchievementPanel data={data} />
    </Flex>
  )
}

import { Card, Flex, Tabs } from 'antd'

import { useAuth } from '@/auth/AuthContext'
import { PageHeader } from '@/components/PageHeader'

import { MyApplications } from './application/MyApplications'
import { PendingApprovals } from './application/PendingApprovals'

export function ApplicationPage(): React.ReactNode {
  const { isAdmin } = useAuth()

  const tabs = [
    { key: 'mine', label: '我的申请', children: <MyApplications /> },
    ...(isAdmin ? [{ key: 'pending', label: '待我审批', children: <PendingApprovals /> }] : []),
  ]

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title="调课请假"
        description="提交调课 / 请假申请并跟踪审批状态；院系管理员在此完成审批"
      />
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs items={tabs} />
      </Card>
    </Flex>
  )
}

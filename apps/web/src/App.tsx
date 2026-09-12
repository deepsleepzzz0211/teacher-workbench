import { Spin } from 'antd'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'

import { AppLayout } from '@/components/AppLayout'
import { useAuth } from '@/auth/AuthContext'
import { AchievementPage } from '@/pages/AchievementPage'
import { ApplicationPage } from '@/pages/ApplicationPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { NoticePage } from '@/pages/NoticePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PracticePage } from '@/pages/PracticePage'
import { SchedulePage } from '@/pages/SchedulePage'
import { TodoPage } from '@/pages/TodoPage'
import { WorkloadPage } from '@/pages/WorkloadPage'

function RequireAuth(): React.ReactNode {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" tip="正在加载工作台 ..." />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

export default function App(): React.ReactNode {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/workload" element={<WorkloadPage />} />
          <Route path="/achievements" element={<AchievementPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/applications" element={<ApplicationPage />} />
          <Route path="/notices" element={<NoticePage />} />
          <Route path="/todos" element={<TodoPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

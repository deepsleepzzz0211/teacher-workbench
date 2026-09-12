import { lazy, Suspense } from 'react'

import { Spin } from 'antd'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'

import { AppLayout } from '@/components/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/auth/AuthContext'

const AchievementPage = lazy(() =>
  import('@/pages/AchievementPage').then((module) => ({ default: module.AchievementPage })),
)
const ApplicationPage = lazy(() =>
  import('@/pages/ApplicationPage').then((module) => ({ default: module.ApplicationPage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const NoticePage = lazy(() =>
  import('@/pages/NoticePage').then((module) => ({ default: module.NoticePage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)
const PracticePage = lazy(() =>
  import('@/pages/PracticePage').then((module) => ({ default: module.PracticePage })),
)
const SchedulePage = lazy(() =>
  import('@/pages/SchedulePage').then((module) => ({ default: module.SchedulePage })),
)
const TodoPage = lazy(() =>
  import('@/pages/TodoPage').then((module) => ({ default: module.TodoPage })),
)
const WorkloadPage = lazy(() =>
  import('@/pages/WorkloadPage').then((module) => ({ default: module.WorkloadPage })),
)

function PageLoading(): React.ReactNode {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  )
}

function RequireAuth(): React.ReactNode {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <PageLoading />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

export default function App(): React.ReactNode {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>
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
      </Suspense>
    </ErrorBoundary>
  )
}

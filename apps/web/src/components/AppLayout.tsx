import { Avatar, Dropdown, Layout, Menu, Space, Typography } from 'antd'
import {
  AppstoreOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CarryOutOutlined,
  CheckSquareOutlined,
  FieldTimeOutlined,
  LogoutOutlined,
  ScheduleOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { ROLE_LABELS } from '@tw/shared'
import { SIDER_BG } from '@/theme'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const { Header, Sider, Content } = Layout

const MENU_ITEMS = [
  { key: '/', icon: <AppstoreOutlined />, label: <Link to="/">工作台</Link> },
  { key: '/schedule', icon: <CalendarOutlined />, label: <Link to="/schedule">我的课表</Link> },
  { key: '/workload', icon: <FieldTimeOutlined />, label: <Link to="/workload">教学工作量</Link> },
  { key: '/achievements', icon: <BookOutlined />, label: <Link to="/achievements">教科研成果</Link> },
  { key: '/practice', icon: <ScheduleOutlined />, label: <Link to="/practice">企业实践</Link> },
  { key: '/applications', icon: <CarryOutOutlined />, label: <Link to="/applications">调课请假</Link> },
  { key: '/notices', icon: <BellOutlined />, label: <Link to="/notices">通知公告</Link> },
  { key: '/todos', icon: <CheckSquareOutlined />, label: <Link to="/todos">待办事项</Link> },
]

export function AppLayout(): React.ReactNode {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const selectedKey = MENU_ITEMS.map((item) => item.key)
    .filter((key) => key !== '/' && location.pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0] ?? '/'

  const handleLogout = (): void => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={228} style={{ position: 'sticky', top: 0, height: '100vh' }}>
        <div
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 20px',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'linear-gradient(135deg,#1d4ed8,#38bdf8)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            教
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 0.5 }}>教师工作台</span>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={MENU_ITEMS}
          style={{ borderInlineEnd: 'none', background: SIDER_BG }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            borderBottom: '1px solid #eef1f7',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Typography.Text type="secondary">
            {user?.department ?? ''} · 高职院校教师工作台
          </Typography.Text>

          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer' }} data-testid="user-menu">
              <Avatar size={32} icon={<UserOutlined />} style={{ background: '#1d4ed8' }} />
              <span>
                {user?.name}
                <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  {user ? ROLE_LABELS[user.role] : ''}
                </Typography.Text>
              </span>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ padding: 24 }}>
          <div style={{ maxWidth: 1360, margin: '0 auto' }}>
            <ErrorBoundary key={location.pathname} onReset={() => navigate('/')}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

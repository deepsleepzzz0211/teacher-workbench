import { Avatar, Dropdown, Layout, Menu, Typography } from 'antd'
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
import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Spin } from 'antd'

import { useAuth } from '@/auth/AuthContext'
import { ROLE_LABELS } from '@tw/shared'
import { palette } from '@/theme'
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

const USER_MENU_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 10px',
  background: 'none',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  font: 'inherit',
  color: 'inherit',
}

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

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const openedByKeyboardRef = useRef(false)

  // AntD 菜单项是 tabindex="-1"，focus 不会自己进入菜单，键盘用户因此走不到"退出登录"。
  // 仅在本次展开由键盘发起时把焦点送进去；悬停/点击也抢焦点会破坏鼠标路径。
  useEffect(() => {
    if (!userMenuOpen || !openedByKeyboardRef.current) return
    openedByKeyboardRef.current = false
    document.querySelector<HTMLElement>('.user-menu-dropdown .ant-dropdown-menu-item')?.focus()
  }, [userMenuOpen])

  const handleUserMenuKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'ArrowDown') {
      openedByKeyboardRef.current = true
      setUserMenuOpen(true)
      event.preventDefault()
      return
    }
    // Enter / 空格走按钮自身的 click 展开，这里只做标记，不拦截默认行为
    if (event.key === 'Enter' || event.key === ' ') openedByKeyboardRef.current = true
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
            color: palette.surface,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: `linear-gradient(135deg,${palette.primary},${palette.primaryLight})`,
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
          style={{ borderInlineEnd: 'none', background: palette.sider }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            borderBottom: `1px solid ${palette.borderSubtle}`,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Typography.Text type="secondary">
            {user?.department ?? ''} · 高职院校教师工作台
          </Typography.Text>

          <Dropdown
            open={userMenuOpen}
            onOpenChange={setUserMenuOpen}
            trigger={['click', 'hover']}
            overlayClassName="user-menu-dropdown"
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
            <button
              type="button"
              data-testid="user-menu"
              style={USER_MENU_STYLE}
              onKeyDown={handleUserMenuKeyDown}
            >
              <Avatar size={32} icon={<UserOutlined />} style={{ background: palette.primary }} />
              <span>{user?.name}</span>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {user ? ROLE_LABELS[user.role] : ''}
              </Typography.Text>
            </button>
          </Dropdown>
        </Header>

        <Content style={{ padding: 24 }}>
          <div style={{ maxWidth: 1360, margin: '0 auto' }}>
            <ErrorBoundary key={location.pathname} onReset={() => navigate('/')}>
              <Suspense
                fallback={
                  <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
                    <Spin />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

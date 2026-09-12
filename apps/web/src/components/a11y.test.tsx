import { describe, expect, it, vi } from 'vitest'

import { App as AntApp, ConfigProvider } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AuthProvider } from '@/auth/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import { NoticePage } from '@/pages/NoticePage'

vi.mock('@/api/endpoints', () => ({
  noticeApi: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'notice-1',
          title: '关于开展课程建设专项检查的通知',
          content: '各二级学院：请于本月末前完成自查。',
          category: 'academic',
          isTop: false,
          publisherId: null,
          publisherName: '教务处',
          publishedAt: '2026-09-01T02:00:00.000Z',
          isRead: false,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      unreadCount: 1,
    }),
    markRead: vi.fn().mockResolvedValue({ ok: true }),
    create: vi.fn(),
    detail: vi.fn(),
  },
}))

function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <ConfigProvider>
      <AntApp>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          {children}
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  )
}

function renderLayout(): void {
  render(
    <Providers>
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>首页内容</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </Providers>,
  )
}

function renderNotices(): void {
  render(
    <Providers>
      <MemoryRouter>
        <AuthProvider>
          <NoticePage />
        </AuthProvider>
      </MemoryRouter>
    </Providers>,
  )
}

describe('键盘可达性：账户菜单', () => {
  it('账户菜单是可聚焦的按钮，而不是仅能点击的容器', () => {
    renderLayout()

    const trigger = screen.getByTestId('user-menu')
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger).toHaveAttribute('type', 'button')
  })

  it('账户菜单展开后的菜单项可被键盘聚焦', async () => {
    renderLayout()

    const trigger = screen.getByTestId('user-menu')
    trigger.focus()
    await userEvent.keyboard('{Enter}')

    const logoutItem = await screen.findByRole('menuitem', { name: /退出登录/ })
    logoutItem.focus()
    expect(logoutItem).toHaveFocus()
  })
})

describe('键盘可达性：通知列表', () => {
  it('通知列表项是可聚焦的按钮，而不是带点击事件的普通容器', async () => {
    renderNotices()

    const row = await screen.findByRole('button', { name: /课程建设专项检查/ })
    row.focus()
    expect(row).toHaveFocus()
  })

  it('通知列表项可用回车打开详情', async () => {
    renderNotices()

    const row = await screen.findByRole('button', { name: /课程建设专项检查/ })
    row.focus()
    await userEvent.keyboard('{Enter}')

    expect(await screen.findByText(/请于本月末前完成自查/)).toBeInTheDocument()
  })
})

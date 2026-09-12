import { describe, expect, it } from 'vitest'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

import { AuthProvider, useAuth } from './AuthContext'
import { getToken, setToken } from '@/api/client'

function LogoutHarness(): ReactNode {
  const { logout } = useAuth()
  return (
    <button type="button" onClick={logout}>
      退出
    </button>
  )
}

function renderWithCache(client: QueryClient): void {
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <LogoutHarness />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('AuthContext 登出行为', () => {
  it('登出会清空查询缓存，避免换账号后看到上一个账号的数据', async () => {
    const client = new QueryClient()
    client.setQueryData(['dashboard'], { totalHours: 468.2 })
    client.setQueryData(['notices', 1, 10], { unreadCount: 4 })

    renderWithCache(client)
    expect(client.getQueryData(['dashboard'])).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: '退出' }))

    expect(client.getQueryData(['dashboard'])).toBeUndefined()
    expect(client.getQueryData(['notices', 1, 10])).toBeUndefined()
  })

  it('登出会清除本地令牌', async () => {
    setToken('a-stale-token')
    const client = new QueryClient()

    renderWithCache(client)
    expect(getToken()).toBe('a-stale-token')

    await userEvent.click(screen.getByRole('button', { name: '退出' }))

    expect(getToken()).toBeNull()
  })
})

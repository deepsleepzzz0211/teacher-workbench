import { describe, expect, it } from 'vitest'

import { App as AntApp, ConfigProvider } from 'antd'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { AuthProvider } from '@/auth/AuthContext'
import { StatCard } from '@/components/PageHeader'
import { ApplicationStatusTag, LevelTag, TodoPriorityTag } from '@/components/tags'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

describe('StatCard', () => {
  it('渲染标题、数值、后缀与提示', () => {
    render(<StatCard title="本学期折算学时" value="468.2" suffix="学时" hint="基本工作量 240 学时" />)

    expect(screen.getByText('本学期折算学时')).toBeInTheDocument()
    expect(screen.getByText('468.2')).toBeInTheDocument()
    expect(screen.getByText('学时')).toBeInTheDocument()
    expect(screen.getByText('基本工作量 240 学时')).toBeInTheDocument()
  })

  it('可渲染状态标签', () => {
    render(<StatCard title="达标情况" value="195%" status={<span>已达标</span>} />)
    expect(screen.getByText('已达标')).toBeInTheDocument()
  })
})

describe('标签组件', () => {
  it('申请状态映射为中文文案', () => {
    render(
      <>
        <ApplicationStatusTag status="pending" />
        <ApplicationStatusTag status="approved" />
        <ApplicationStatusTag status="rejected" />
      </>,
    )
    expect(screen.getByText('待审批')).toBeInTheDocument()
    expect(screen.getByText('已通过')).toBeInTheDocument()
    expect(screen.getByText('已驳回')).toBeInTheDocument()
  })

  it('待办优先级映射为中文文案', () => {
    render(<TodoPriorityTag priority="high" />)
    expect(screen.getByText('高优先级')).toBeInTheDocument()
  })

  it('成果级别使用传入的标签文案', () => {
    render(<LevelTag level="provincial" label="省级" />)
    expect(screen.getByText('省级')).toBeInTheDocument()
  })
})

function renderLogin(): void {
  render(
    <ConfigProvider>
      <AntApp>
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      </AntApp>
    </ConfigProvider>,
  )
}

describe('LoginPage', () => {
  it('渲染用户名与密码输入框以及登录按钮', () => {
    renderLogin()

    expect(screen.getByPlaceholderText('例如 t1001')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登 录' })).toBeInTheDocument()
  })

  it('展示演示账号入口', () => {
    renderLogin()

    expect(screen.getByText('专任教师 · 陈立群')).toBeInTheDocument()
    expect(screen.getByText('院系管理员 · 刘建国')).toBeInTheDocument()
  })

  it('点击演示账号自动填入用户名与密码', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByText('专任教师 · 陈立群'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('例如 t1001')).toHaveValue('t1001')
    })
    expect(screen.getByPlaceholderText('请输入密码')).toHaveValue('Teach@2026')
  })

  it('未填写用户名时提交给出校验提示，不触发请求', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: '登 录' }))

    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeInTheDocument()
    })
  })
})

describe('NotFoundPage', () => {
  it('渲染 404 提示与返回按钮', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('页面不存在')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回工作台' })).toBeInTheDocument()
  })
})

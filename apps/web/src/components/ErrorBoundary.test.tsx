import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

import { ErrorBoundary } from './ErrorBoundary'

function Bomb(): ReactNode {
  throw new Error('内部实现细节：数据库连接串 aaa-bbb-ccc')
}

const consoleError = vi.spyOn(console, 'error')

describe('ErrorBoundary', () => {
  beforeEach(() => {
    consoleError.mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleError.mockClear()
  })

  it('未发生错误时原样渲染子组件，不改变既有行为', () => {
    render(
      <ErrorBoundary>
        <div>正常内容</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('正常内容')).toBeInTheDocument()
  })

  it('子组件抛错时展示可恢复的错误页，而不是白屏', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByText('页面出错了')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回工作台' })).toBeInTheDocument()
  })

  it('不把内部错误信息渲染到界面上', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.queryByText(/数据库连接串/)).toBeNull()
    expect(screen.queryByText(/内部实现细节/)).toBeNull()
  })

  it('把详细错误写入控制台，便于排查', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(consoleError).toHaveBeenCalled()
  })

  it('点击返回操作时通知上层，由上层完成跳转', async () => {
    const onReset = vi.fn()
    render(
      <ErrorBoundary onReset={onReset}>
        <Bomb />
      </ErrorBoundary>,
    )

    await userEvent.click(screen.getByRole('button', { name: '返回工作台' }))

    expect(onReset).toHaveBeenCalledTimes(1)
  })
})

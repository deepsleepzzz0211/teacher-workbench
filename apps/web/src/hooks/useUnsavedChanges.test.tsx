import { describe, expect, it, vi } from 'vitest'

import { App as AntApp, Button, Form, Input } from 'antd'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

import { useUnsavedChanges } from './useUnsavedChanges'

function Host({ onClosed }: { onClosed: () => void }): ReactNode {
  const [form] = Form.useForm<{ title: string }>()
  const guard = useUnsavedChanges(form)

  return (
    <AntApp>
      <Form form={form}>
        <Form.Item name="title" label="标题">
          <Input placeholder="标题" />
        </Form.Item>
      </Form>
      <Button onClick={() => guard.requestClose(onClosed)}>取消</Button>
      {guard.confirmNode}
    </AntApp>
  )
}

describe('useUnsavedChanges', () => {
  it('表单没有改动时，关闭操作直接执行，不弹确认', async () => {
    const onClosed = vi.fn()
    render(<Host onClosed={onClosed} />)

    await userEvent.click(screen.getByRole('button', { name: /取\s*消/ }))

    expect(onClosed).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('放弃未保存的修改？')).toBeNull()
  })

  it('表单有改动时，先弹确认而不是直接关闭', async () => {
    const onClosed = vi.fn()
    render(<Host onClosed={onClosed} />)

    await userEvent.type(screen.getByPlaceholderText('标题'), '填了一些内容')
    await userEvent.click(screen.getByRole('button', { name: /取\s*消/ }))

    expect(onClosed).not.toHaveBeenCalled()
    expect(await screen.findByText('放弃未保存的修改？')).toBeInTheDocument()
  })

  it('确认放弃后才真正关闭', async () => {
    const onClosed = vi.fn()
    render(<Host onClosed={onClosed} />)

    await userEvent.type(screen.getByPlaceholderText('标题'), '填了一些内容')
    await userEvent.click(screen.getByRole('button', { name: /取\s*消/ }))
    await screen.findByText('放弃未保存的修改？')

    await userEvent.click(screen.getByRole('button', { name: /放弃修改/ }))

    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('选择继续编辑时不关闭，内容保留', async () => {
    const onClosed = vi.fn()
    render(<Host onClosed={onClosed} />)

    await userEvent.type(screen.getByPlaceholderText('标题'), '填了一些内容')
    await userEvent.click(screen.getByRole('button', { name: /取\s*消/ }))
    await screen.findByText('放弃未保存的修改？')

    await userEvent.click(screen.getByRole('button', { name: /继续编辑/ }))

    expect(onClosed).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('标题')).toHaveValue('填了一些内容')
  })
})

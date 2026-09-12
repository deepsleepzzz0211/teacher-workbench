import { describe, expect, it, vi } from 'vitest'

import { App as AntApp, ConfigProvider, Form, Input } from 'antd'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactNode } from 'react'

import { FormModal, StatRow, useConfirmDelete } from '@/components/blocks'
import { StatCard } from '@/components/PageHeader'

function renderWithApp(node: ReactNode): ReturnType<typeof render> {
  return render(
    <ConfigProvider>
      <AntApp>{node}</AntApp>
    </ConfigProvider>,
  )
}

function colsOf(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('.ant-col'))
}

describe('StatRow', () => {
  it('渲染全部统计卡', () => {
    renderWithApp(
      <StatRow>
        <StatCard title="成果总数" value={12} />
        <StatCard title="业绩总分" value={86.5} />
        <StatCard title="省级" value={3} />
      </StatRow>,
    )

    expect(screen.getByText('成果总数')).toBeInTheDocument()
    expect(screen.getByText('业绩总分')).toBeInTheDocument()
    expect(screen.getByText('省级')).toBeInTheDocument()
  })

  it('三张卡时每列占 sm 的 8 格，与现有页面的三列布局一致', () => {
    const { container } = renderWithApp(
      <StatRow>
        <StatCard title="A" value={1} />
        <StatCard title="B" value={2} />
        <StatCard title="C" value={3} />
      </StatRow>,
    )

    const cols = colsOf(container)
    expect(cols).toHaveLength(3)
    for (const col of cols) {
      expect(col.className).toContain('ant-col-xs-24')
      expect(col.className).toContain('ant-col-sm-8')
    }
  })

  it('四张卡时窄屏两列、宽屏四列，与现有页面的四列布局一致', () => {
    const { container } = renderWithApp(
      <StatRow>
        <StatCard title="A" value={1} />
        <StatCard title="B" value={2} />
        <StatCard title="C" value={3} />
        <StatCard title="D" value={4} />
      </StatRow>,
    )

    const cols = colsOf(container)
    expect(cols).toHaveLength(4)
    for (const col of cols) {
      expect(col.className).toContain('ant-col-xs-24')
      expect(col.className).toContain('ant-col-sm-12')
      expect(col.className).toContain('ant-col-xl-6')
    }
  })
})

interface HarnessValues {
  title: string
}

function FormModalHarness({
  onSubmit,
  submitting = false,
  onValuesChange,
}: {
  onSubmit: () => void
  submitting?: boolean
  onValuesChange?: (changed: Partial<HarnessValues>, all: HarnessValues) => void
}): ReactNode {
  const [form] = Form.useForm<HarnessValues>()
  const [open, setOpen] = useState(true)

  return (
    <FormModal
      title="新增待办"
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={onSubmit}
      submitting={submitting}
      form={form}
      onValuesChange={onValuesChange}
    >
      <Form.Item name="title" label="待办内容">
        <Input />
      </Form.Item>
    </FormModal>
  )
}

describe('FormModal', () => {
  it('渲染标题，并把子内容放进表单里', async () => {
    renderWithApp(<FormModalHarness onSubmit={vi.fn()} />)

    expect(await screen.findByText('新增待办')).toBeInTheDocument()
    expect(screen.getByLabelText('待办内容')).toBeInTheDocument()
  })

  it('点击取消关闭弹窗，把关闭权交回调用方', async () => {
    const user = userEvent.setup()
    renderWithApp(<FormModalHarness onSubmit={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: '取 消' }))

    await waitFor(() => expect(screen.queryByText('新增待办')).not.toBeInTheDocument())
  })

  it('点击保存触发提交回调', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderWithApp(<FormModalHarness onSubmit={onSubmit} />)

    await user.click(await screen.findByRole('button', { name: '保 存' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('提交中时保存按钮进入加载态', async () => {
    renderWithApp(<FormModalHarness onSubmit={vi.fn()} submitting />)

    const dialog = await screen.findByRole('dialog')

    await waitFor(() => expect(dialog.querySelector('.ant-btn-loading')).not.toBeNull())
  })

  it('表单值变化时向外抛出，供实时预览使用', async () => {
    const user = userEvent.setup()
    const onValuesChange = vi.fn()
    renderWithApp(<FormModalHarness onSubmit={vi.fn()} onValuesChange={onValuesChange} />)

    await user.type(await screen.findByLabelText('待办内容'), '提交教学任务确认单')

    await waitFor(() => expect(onValuesChange).toHaveBeenCalled())
    expect(onValuesChange.mock.calls.at(-1)?.[0]).toEqual({ title: '提交教学任务确认单' })
  })
})

function ConfirmHarness({ onConfirm }: { onConfirm: () => void }): ReactNode {
  const confirmDelete = useConfirmDelete()

  return (
    <button
      type="button"
      onClick={() => confirmDelete({ title: '删除待办', content: '确定删除「测试待办」吗？', onConfirm })}
    >
      触发删除
    </button>
  )
}

describe('useConfirmDelete', () => {
  it('弹出确认框，把删除动作标成危险操作，确认后回调', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderWithApp(<ConfirmHarness onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: '触发删除' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByText('删除待办').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('确定删除「测试待办」吗？')).toBeInTheDocument()

    const confirmButton = within(dialog).getByRole('button', { name: '删 除' })
    expect(confirmButton.className).toContain('ant-btn-dangerous')

    await user.click(confirmButton)
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  })

  it('取消时不回调', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderWithApp(<ConfirmHarness onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: '触发删除' }))
    await user.click(await screen.findByRole('button', { name: '取 消' }))

    await waitFor(() => expect(screen.queryByText('删除待办')).not.toBeInTheDocument())
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

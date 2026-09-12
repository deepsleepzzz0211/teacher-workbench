/**
 * 授课任务的实时折算预览 —— 本产品的招牌功能，此前完全没有测试。
 *
 * 这里渲染真实页面、操作真实表单，断言**屏幕上的文字与数字**；折算函数本身
 * 已有 shared 层单元测试覆盖，这里要盯的是"表单里选的课程类型/人数有没有正确喂给预览"。
 *
 * 注意：AntD Select 的下拉项必须点击其内层 .ant-select-item-option-content 节点才会
 * 真正选中——点 role="option" 外层节点不会报错，但也不会提交选中值。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App as AntApp, ConfigProvider } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { WORKLOAD_ITEM_CATEGORIES, type ClassGroup, type Course, type Term } from '@tw/shared'

import { WorkloadPage } from '@/pages/WorkloadPage'

vi.mock('@/components/EChart', () => ({ EChart: () => <div data-testid="chart" /> }))

const { catalogApi, workloadApi } = vi.hoisted(() => ({
  catalogApi: { terms: vi.fn(), courses: vi.fn(), classes: vi.fn() },
  workloadApi: {
    summary: vi.fn(),
    tasks: vi.fn(),
    items: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    createItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}))

vi.mock('@/api/endpoints', () => ({ catalogApi, workloadApi }))

const TERM: Term = {
  id: 'term-1',
  name: '2025-2026 第二学期',
  startDate: '2026-02-23',
  endDate: '2026-07-10',
  isCurrent: true,
}

const PRACTICE_COURSE: Course = {
  id: 'course-1',
  code: 'SK001',
  name: '数控加工实训',
  courseType: 'practice',
  credits: 3,
  hours: 40,
}

const CLASS_AT_THRESHOLD: ClassGroup = {
  id: 'class-1',
  name: '数控2401',
  major: '数控技术',
  grade: 2024,
  studentCount: 40,
}

function zeroRecord(keys: readonly string[]): Record<string, number> {
  return keys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0
    return acc
  }, {})
}

function renderPage(): void {
  render(
    <ConfigProvider>
      <AntApp>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <MemoryRouter>
            <WorkloadPage />
          </MemoryRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>,
  )
}

async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  fieldLabel: string,
  optionName: RegExp,
): Promise<void> {
  fireEvent.mouseDown(screen.getByLabelText(fieldLabel))
  await user.click(await screen.findByText(optionName))
}

async function openTaskModalWithSelection(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(await screen.findByRole('button', { name: /新增授课任务/ }))
  await selectOption(user, '课程', /数控加工实训/)
  await selectOption(user, '授课班级', /数控2401/)
}

function previewText(): string {
  return screen.getByText('折算预览').parentElement?.parentElement?.textContent ?? ''
}

// 渲染整页（含两张表格与图表）并在弹窗里操作 AntD 表单，单个用例约 8 秒，
// 远超默认 5 秒；这里按套件放宽，避免动全局默认值掩盖其它真正卡死的用例。
describe('WorkloadPage 折算预览', { timeout: 20_000 }, () => {
  beforeEach(() => {
    catalogApi.terms.mockResolvedValue([TERM])
    catalogApi.courses.mockResolvedValue([PRACTICE_COURSE])
    catalogApi.classes.mockResolvedValue([CLASS_AT_THRESHOLD])
    workloadApi.tasks.mockResolvedValue([])
    workloadApi.items.mockResolvedValue([])
    workloadApi.summary.mockResolvedValue({
      termId: TERM.id,
      termName: TERM.name,
      taskHours: 0,
      itemHours: 0,
      taskCount: 0,
      itemCount: 0,
      totalHours: 0,
      requiredHours: 240,
      achievementRate: 0,
      byCourseType: zeroRecord(['theory', 'integrated', 'practice', 'internship']),
      byItemCategory: zeroRecord(WORKLOAD_ITEM_CATEGORIES),
      weekly: [],
    })
  })

  it('选定实训课与班级后，预览按课程类型系数折算（40 × 1.20 = 48.0）', async () => {
    const user = userEvent.setup()
    renderPage()

    await openTaskModalWithSelection(user)

    expect(await screen.findByText(/40 学时 × 1\.20（实训课）× 1\.00（40 人）× 1\.00（首次授课）/)).toBeInTheDocument()
    expect(screen.getByText('48.0 折算学时')).toBeInTheDocument()
  })

  it('人数跨过 40 人阈值时，预览里的班级规模系数由 1.00 变为 1.10', async () => {
    const user = userEvent.setup()
    renderPage()

    await openTaskModalWithSelection(user)
    expect(await screen.findByText(/1\.00（40 人）/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('班级人数'), { target: { value: '50' } })

    expect(await screen.findByText(/1\.10（50 人）/)).toBeInTheDocument()
    expect(screen.getByText('52.8 折算学时')).toBeInTheDocument()
  })

  it('重复课次序大于 1 时，预览体现 0.90 的重复课系数', async () => {
    const user = userEvent.setup()
    renderPage()

    await openTaskModalWithSelection(user)

    fireEvent.change(screen.getByLabelText('重复课次序'), { target: { value: '2' } })

    expect(await screen.findByText(/0\.90（第 2 次授课）/)).toBeInTheDocument()
    expect(screen.getByText('43.2 折算学时')).toBeInTheDocument()
  })

  it('改动总学时立即反映到预览', async () => {
    const user = userEvent.setup()
    renderPage()

    await openTaskModalWithSelection(user)
    fireEvent.change(screen.getByLabelText('总学时'), { target: { value: '64' } })

    expect(await screen.findByText(/64 学时 × 1\.20（实训课）/)).toBeInTheDocument()
    expect(screen.getByText('76.8 折算学时')).toBeInTheDocument()
    expect(previewText()).toContain('76.8')
  })
})

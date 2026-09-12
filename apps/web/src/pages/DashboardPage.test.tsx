/**
 * 首页看板 —— 教师每天打开的第一屏，此前完全没有测试。
 * 断言各统计卡片按接口数据渲染，以及接口失败时给出可读的错误提示。
 */
import { describe, expect, it, vi } from 'vitest'

import { App as AntApp, ConfigProvider } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import {
  ACHIEVEMENT_CATEGORY_LABELS,
  WORKLOAD_ITEM_CATEGORIES,
  type DashboardOverview,
} from '@tw/shared'

import { DashboardPage } from '@/pages/DashboardPage'

vi.mock('@/components/EChart', () => ({ EChart: () => <div data-testid="chart" /> }))

const { dashboardApi } = vi.hoisted(() => ({ dashboardApi: { overview: vi.fn() } }))

vi.mock('@/api/endpoints', () => ({ dashboardApi }))

function zeroRecord(keys: readonly string[]): Record<string, number> {
  return keys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0
    return acc
  }, {})
}

const OVERVIEW: DashboardOverview = {
  teacher: { name: '陈立群', department: '智能制造学院', title: '讲师', role: 'teacher' },
  today: { date: '2026-03-02', weekday: 1, isTeachingDay: false, courses: [], hours: 0, showingFrom: null },
  currentTerm: { id: 'term-1', name: '2025-2026 第二学期', week: 3 },
  workload: {
    termId: 'term-1',
    termName: '2025-2026 第二学期',
    taskHours: 400,
    itemHours: 68.2,
    taskCount: 4,
    itemCount: 3,
    totalHours: 468.2,
    requiredHours: 240,
    achievementRate: 1.951,
    byCourseType: { theory: 100, integrated: 120, practice: 180, internship: 0 },
    byItemCategory: zeroRecord(WORKLOAD_ITEM_CATEGORIES),
    weekly: [],
  },
  todos: [],
  notices: [],
  achievement: {
    total: 12,
    scoreSum: 86.5,
    byCategory: zeroRecord(Object.keys(ACHIEVEMENT_CATEGORY_LABELS)),
    recent: [],
  },
  practice: { accumulatedDays: 210, requiredDays: 180, rate: 1.4, remainingDays: 0, records: [] },
  weekSchedule: [],
  counters: { pendingTodos: 3, unreadNotices: 2, pendingApplications: 1 },
}

function renderPage(): void {
  render(
    <ConfigProvider>
      <AntApp>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>,
  )
}

describe('DashboardPage', () => {
  it('按接口数据渲染折算学时、达成率与企业实践进度', async () => {
    dashboardApi.overview.mockResolvedValue(OVERVIEW)
    renderPage()

    expect(await screen.findByText('468.2')).toBeInTheDocument()
    expect(screen.getByText(/基本工作量 240 学时 · 达成 195\.1%/)).toBeInTheDocument()
    // 468.2 / 240 已超过基本工作量
    expect(screen.getByText(/已超出基本工作量 228\.2 折算学时/)).toBeInTheDocument()
    expect(screen.getByText('已达标')).toBeInTheDocument()

    // 企业实践：210 天已达 180 天要求
    expect(screen.getByText('210')).toBeInTheDocument()
    expect(screen.getByText(/近 5 年累计 210 天 \/ 要求 180 天，已满足政策要求/)).toBeInTheDocument()

    expect(screen.getByText(/累计业绩分 86\.5/)).toBeInTheDocument()
    expect(screen.getByText(/未读通知 2 条 · 待审批 1 条/)).toBeInTheDocument()
  })

  it('接口失败时渲染错误提示而不是空白页', async () => {
    dashboardApi.overview.mockRejectedValue(new Error('网络连接失败'))
    renderPage()

    expect(await screen.findByText('工作台数据加载失败')).toBeInTheDocument()
    expect(screen.getByText('网络连接失败')).toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'

import { render, screen } from '@testing-library/react'

import { TaskPreviewBox } from './TaskPreviewBox'
import { EMPTY_TASK_PREVIEW, type TaskPreview } from './types'

function preview(overrides: Partial<TaskPreview> = {}): TaskPreview {
  return { ...EMPTY_TASK_PREVIEW, totalHours: 40, courseType: 'practice', studentCount: 40, ...overrides }
}

describe('TaskPreviewBox', () => {
  it('按课程类型系数折算，并列出每一项系数', () => {
    render(<TaskPreviewBox preview={preview()} />)

    expect(screen.getByText(/40 学时 × 1\.20（实训课）× 1\.00（40 人）× 1\.00（首次授课）/)).toBeInTheDocument()
    expect(screen.getByText('48.0 折算学时')).toBeInTheDocument()
  })

  it('人数超过 40 时班级规模系数按每人 +1% 上调', () => {
    render(<TaskPreviewBox preview={preview({ studentCount: 50 })} />)

    expect(screen.getByText(/1\.10（50 人）/)).toBeInTheDocument()
    expect(screen.getByText('52.8 折算学时')).toBeInTheDocument()
  })

  it('重复课次序大于 1 时按 0.90 折算并标明次数', () => {
    render(<TaskPreviewBox preview={preview({ repeatIndex: 2 })} />)

    expect(screen.getByText(/0\.90（第 2 次授课）/)).toBeInTheDocument()
    expect(screen.getByText('43.2 折算学时')).toBeInTheDocument()
  })

  it('未填写学时与人数时显示 0，不出现 NaN', () => {
    render(<TaskPreviewBox preview={EMPTY_TASK_PREVIEW} />)

    expect(screen.getByText(/0 学时 × 1\.00（理论课）× 1\.00（0 人）× 1\.00（首次授课）/)).toBeInTheDocument()
    expect(screen.getByText('0.0 折算学时')).toBeInTheDocument()
  })
})

import { Children, type ReactNode } from 'react'

import { Col, Row } from 'antd'

interface ColSpan {
  xs: number
  sm: number
  xl?: number
}

const COL_SPANS: Record<number, ColSpan> = {
  2: { xs: 24, sm: 12 },
  3: { xs: 24, sm: 8 },
  4: { xs: 24, sm: 12, xl: 6 },
}

function spanFor(count: number): ColSpan {
  const preset = COL_SPANS[count]
  if (preset) return preset
  return { xs: 24, sm: Math.max(1, Math.floor(24 / Math.max(1, count))) }
}

export function StatRow({ children }: { children: ReactNode }): ReactNode {
  const span = spanFor(Children.count(children))

  return (
    <Row gutter={[16, 16]}>
      {Children.map(children, (child) => (
        <Col {...span}>{child}</Col>
      ))}
    </Row>
  )
}

import { useEffect, useRef } from 'react'

import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([BarChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

type ChartInstance = ReturnType<typeof echarts.init>

export function EChart({
  option,
  height = 280,
}: {
  option: EChartsOption
  height?: number
}): React.ReactNode {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ChartInstance | null>(null)

  useEffect(() => {
    if (!containerRef.current) return undefined

    const chart = echarts.init(containerRef.current)
    chartRef.current = chart

    const handleResize = (): void => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={containerRef} style={{ width: '100%', height }} />
}

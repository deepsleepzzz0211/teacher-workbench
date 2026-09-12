import { useEffect, useRef } from 'react'

import * as echarts from 'echarts'

export function EChart({
  option,
  height = 280,
}: {
  option: echarts.EChartsOption
  height?: number
}): React.ReactNode {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

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

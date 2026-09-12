import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button, Result } from 'antd'

interface ErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[页面渲染失败]', error, info.componentStack)
  }

  private readonly handleReset = (): void => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <Result
        status="error"
        title="页面出错了"
        subTitle="这个页面在渲染时发生了异常，其它功能仍可正常使用。你可以返回工作台，或刷新页面重试。"
        extra={
          <Button type="primary" onClick={this.handleReset}>
            返回工作台
          </Button>
        }
      />
    )
  }
}

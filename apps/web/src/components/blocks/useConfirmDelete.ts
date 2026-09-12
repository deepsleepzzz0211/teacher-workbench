import { useCallback } from 'react'

import { App as AntApp } from 'antd'

export interface ConfirmDeleteOptions {
  title: string
  content: string
  onConfirm: () => unknown
}

export function useConfirmDelete(): (options: ConfirmDeleteOptions) => void {
  const { modal } = AntApp.useApp()

  return useCallback(
    ({ title, content, onConfirm }: ConfirmDeleteOptions) => {
      modal.confirm({
        title,
        content,
        okText: '删除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: () => onConfirm(),
      })
    },
    [modal],
  )
}

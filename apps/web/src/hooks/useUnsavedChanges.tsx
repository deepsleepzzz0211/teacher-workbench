import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { Modal, Typography } from 'antd'
import type { FormInstance } from 'antd'

export interface UnsavedChangesGuard {
  requestClose: (close: () => void) => void
  confirmNode: ReactNode
}

export function useUnsavedChanges(form: FormInstance): UnsavedChangesGuard {
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null)

  const requestClose = useCallback(
    (close: () => void) => {
      if (form.isFieldsTouched()) {
        setPendingClose(() => close)
        return
      }
      close()
    },
    [form],
  )

  const confirmNode = useMemo(
    () => (
      <Modal
        open={pendingClose !== null}
        title="放弃未保存的修改？"
        okText="放弃修改"
        cancelText="继续编辑"
        okButtonProps={{ danger: true }}
        onOk={() => {
          const close = pendingClose
          setPendingClose(null)
          close?.()
        }}
        onCancel={() => setPendingClose(null)}
        destroyOnHidden
      >
        <Typography.Text>当前表单有未保存的改动，关闭后将会丢失。</Typography.Text>
      </Modal>
    ),
    [pendingClose],
  )

  return { requestClose, confirmNode }
}

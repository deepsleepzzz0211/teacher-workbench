import type { ReactNode } from 'react'

import { Form, Modal } from 'antd'
import type { FormInstance } from 'antd'

interface FormModalProps<T> {
  title: string
  open: boolean
  onClose: () => void
  onSubmit: () => void | Promise<void>
  submitting?: boolean
  okText?: string
  cancelText?: string
  width?: number
  form: FormInstance<T>
  onValuesChange?: (changed: Partial<T>, all: T) => void
  children: ReactNode
}

export function FormModal<T>({
  title,
  open,
  onClose,
  onSubmit,
  submitting = false,
  okText = '保存',
  cancelText = '取消',
  width,
  form,
  onValuesChange,
  children,
}: FormModalProps<T>): ReactNode {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={onSubmit}
      confirmLoading={submitting}
      okText={okText}
      cancelText={cancelText}
      width={width}
      destroyOnHidden
    >
      <Form<T> form={form} layout="vertical" onValuesChange={onValuesChange}>
        {children}
      </Form>
    </Modal>
  )
}

import type { ReactNode } from 'react'

import { Card, DatePicker, Form, Input, InputNumber, Select, Space, Typography } from 'antd'
import type { FormInstance } from 'antd'

import {
  calcItemHours,
  type Term,
  WORKLOAD_ITEM_CATEGORIES,
  type WorkloadItemCategory,
  WORKLOAD_ITEM_RULES,
} from '@tw/shared'

import { FormModal } from '@/components/blocks'
import { palette } from '@/theme'

import type { ItemFormValues } from './types'

const ITEM_CATEGORY_OPTIONS = WORKLOAD_ITEM_CATEGORIES.map((value) => ({
  label: WORKLOAD_ITEM_RULES[value].label,
  value,
}))

export interface ItemPreview {
  category: WorkloadItemCategory
  quantity: number
}

interface ItemFormModalProps {
  open: boolean
  form: FormInstance<ItemFormValues>
  preview: ItemPreview
  submitting: boolean
  terms: Term[]
  onClose: () => void
  onSubmit: () => void | Promise<void>
  onValuesChange: (changed: Partial<ItemFormValues>, all: ItemFormValues) => void
}

export function ItemFormModal({
  open,
  form,
  preview,
  submitting,
  terms,
  onClose,
  onSubmit,
  onValuesChange,
}: ItemFormModalProps): ReactNode {
  const rule = WORKLOAD_ITEM_RULES[preview.category]

  return (
    <FormModal
      title="新增其它工作量"
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={submitting}
      form={form}
      onValuesChange={onValuesChange}
    >
      <Form.Item name="termId" label="学期" rules={[{ required: true, message: '请选择学期' }]}>
        <Select options={terms.map((term) => ({ label: term.name, value: term.id }))} />
      </Form.Item>
      <Form.Item name="category" label="类别" rules={[{ required: true, message: '请选择类别' }]}>
        <Select options={ITEM_CATEGORY_OPTIONS} />
      </Form.Item>
      <Form.Item name="title" label="工作内容" rules={[{ required: true, message: '请填写工作内容' }]}>
        <Input placeholder="例如 2026年省职业院校技能大赛指导" />
      </Form.Item>
      <Form.Item label="数量" required>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="quantity" noStyle rules={[{ required: true, message: '请填写数量' }]}>
            <InputNumber min={0.5} max={10000} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Space.Addon>{rule.unit}</Space.Addon>
        </Space.Compact>
      </Form.Item>
      <Form.Item name="occurredOn" label="发生日期" rules={[{ required: true, message: '请选择发生日期' }]}>
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="remark" label="备注">
        <Input />
      </Form.Item>

      <Card size="small" style={{ background: palette.surfaceMuted }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          折算规则
        </Typography.Text>
        <div style={{ marginTop: 6 }}>
          数量 {preview.quantity || 0} {rule.unit} × 系数 {rule.hoursPerUnit} ={' '}
          <Typography.Text strong>
            {calcItemHours({ category: preview.category, quantity: preview.quantity }).toFixed(1)} 折算学时
          </Typography.Text>
        </div>
      </Card>
    </FormModal>
  )
}

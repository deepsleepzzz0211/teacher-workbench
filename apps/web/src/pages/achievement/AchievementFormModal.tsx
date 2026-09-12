import type { ReactNode } from 'react'

import { Col, DatePicker, Form, Input, InputNumber, Row, Select } from 'antd'
import type { FormInstance } from 'antd'

import {
  ACHIEVEMENT_LEVEL_LABELS,
  ACHIEVEMENT_LEVEL_POINTS,
  type AchievementLevel,
} from '@tw/shared'

import { FormModal } from '@/components/blocks'

import { CATEGORY_OPTIONS, LEVEL_OPTIONS } from './options'
import type { AchievementFormValues } from './types'

export interface AchievementFormModalProps {
  open: boolean
  editing: boolean
  form: FormInstance<AchievementFormValues>
  selectedLevel: AchievementLevel
  submitting: boolean
  onClose: () => void
  onSubmit: () => void | Promise<void>
  onValuesChange: (changed: Partial<AchievementFormValues>, all: AchievementFormValues) => void
}

export function AchievementFormModal({
  open,
  editing,
  form,
  selectedLevel,
  submitting,
  onClose,
  onSubmit,
  onValuesChange,
}: AchievementFormModalProps): ReactNode {
  return (
    <FormModal
      title={editing ? '编辑成果' : '登记新成果'}
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={submitting}
      width={640}
      form={form}
      onValuesChange={onValuesChange}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="category" label="成果类别" rules={[{ required: true, message: '请选择成果类别' }]}>
            <Select options={CATEGORY_OPTIONS} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="level" label="成果级别" rules={[{ required: true, message: '请选择成果级别' }]}>
            <Select options={LEVEL_OPTIONS} />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            name="title"
            label="成果名称"
            rules={[
              { required: true, message: '请填写成果名称' },
              { min: 2, message: '成果名称至少 2 个字' },
            ]}
          >
            <Input placeholder="例如 产教融合背景下高职数控专业课程改革实践" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="role" label="本人角色" rules={[{ required: true, message: '请填写本人角色' }]}>
            <Input placeholder="主持人 / 第一作者" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="achievedOn" label="取得日期" rules={[{ required: true, message: '请选择取得日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="score"
            label="自评分值"
            extra={`留空则按级别自动折算：${ACHIEVEMENT_LEVEL_LABELS[selectedLevel]} ${ACHIEVEMENT_LEVEL_POINTS[selectedLevel]} 分`}
          >
            <InputNumber min={0} max={500} style={{ width: '100%' }} placeholder="选填" />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} placeholder="例如 发表期刊、立项单位、佐证材料位置等" />
          </Form.Item>
        </Col>
      </Row>
    </FormModal>
  )
}

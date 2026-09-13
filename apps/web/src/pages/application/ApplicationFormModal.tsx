import type { ReactNode } from 'react'

import { DatePicker, Form, Input, Radio, Select } from 'antd'
import type { FormInstance } from 'antd'

import type { TeachingTask } from '@tw/shared'

import { FormModal } from '@/components/blocks'

import type { ApplicationFormValues } from './types'

interface ApplicationFormModalProps {
  open: boolean
  form: FormInstance<ApplicationFormValues>
  tasks: TeachingTask[]
  isAdjust: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: () => void | Promise<void>
  onValuesChange: (changed: Partial<ApplicationFormValues>, all: ApplicationFormValues) => void
}

export function ApplicationFormModal({
  open,
  form,
  tasks,
  isAdjust,
  submitting,
  onClose,
  onSubmit,
  onValuesChange,
}: ApplicationFormModalProps): ReactNode {
  return (
    <FormModal
      title="发起调课 / 请假申请"
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={submitting}
      okText="提交申请"
      width={640}
      form={form}
      onValuesChange={onValuesChange}
    >
      <Form.Item name="type" label="申请类型" rules={[{ required: true, message: '请选择申请类型' }]}>
        <Radio.Group>
          <Radio.Button value="adjust_class">调课申请</Radio.Button>
          <Radio.Button value="leave">请假申请</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item name="taskId" label="关联授课任务" extra="选填，便于管理员核对课程与班级">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="选择授课任务"
          options={tasks.map((task) => ({
            label: `${task.courseName} · ${task.className}`,
            value: task.id,
          }))}
        />
      </Form.Item>

      <Form.Item
        name="originalDate"
        label="原上课日期"
        rules={[{ required: true, message: '请选择原上课日期' }]}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="originalSection" label="原节次">
        <Input placeholder="例如 第1-4节" />
      </Form.Item>

      <Form.Item
        name="targetDate"
        label="调整后日期"
        rules={isAdjust ? [{ required: true, message: '调课申请需填写调整后日期' }] : []}
      >
        <DatePicker style={{ width: '100%' }} disabled={!isAdjust} />
      </Form.Item>

      <Form.Item name="targetSection" label="调整后节次">
        <Input placeholder="例如 第5-8节" disabled={!isAdjust} />
      </Form.Item>

      <Form.Item
        name="reason"
        label="申请事由"
        rules={[
          { required: true, message: '请填写申请事由' },
          { min: 5, message: '事由至少 5 个字，便于管理员判断' },
        ]}
      >
        <Input.TextArea rows={3} placeholder="请说明具体原因，例如赴企业参加产教融合项目对接会" />
      </Form.Item>
    </FormModal>
  )
}

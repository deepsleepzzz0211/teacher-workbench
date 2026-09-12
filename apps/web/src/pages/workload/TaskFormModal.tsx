import type { ReactNode } from 'react'

import { Col, Form, Input, InputNumber, Row, Select } from 'antd'
import type { FormInstance } from 'antd'

import {
  type ClassGroup,
  COURSE_TYPE_LABELS,
  type Course,
  MAX_WEEKS,
  type Term,
  WEEK_PARITIES,
  WEEKDAY_LABELS,
  WEEK_PARITY_LABELS,
} from '@tw/shared'

import { FormModal } from '@/components/blocks'

import { TaskPreviewBox } from './TaskPreviewBox'
import type { TaskFormValues, TaskPreview } from './types'

const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, index) => ({ label, value: index + 1 }))
const PARITY_OPTIONS = WEEK_PARITIES.map((value) => ({ label: WEEK_PARITY_LABELS[value], value }))

interface TaskFormModalProps {
  open: boolean
  editing: boolean
  form: FormInstance<TaskFormValues>
  preview: TaskPreview
  submitting: boolean
  terms: Term[]
  courses: Course[]
  classes: ClassGroup[]
  onClose: () => void
  onSubmit: () => void | Promise<void>
  onValuesChange: (changed: Partial<TaskFormValues>, all: TaskFormValues) => void
}

export function TaskFormModal({
  open,
  editing,
  form,
  preview,
  submitting,
  terms,
  courses,
  classes,
  onClose,
  onSubmit,
  onValuesChange,
}: TaskFormModalProps): ReactNode {
  return (
    <FormModal
      title={editing ? '编辑授课任务' : '新增授课任务'}
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={submitting}
      width={760}
      form={form}
      onValuesChange={onValuesChange}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="termId" label="学期" rules={[{ required: true, message: '请选择学期' }]}>
            <Select options={terms.map((term) => ({ label: term.name, value: term.id }))} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="courseId" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择课程（自动带出学时）"
              options={courses.map((course) => ({
                label: `${course.name}（${course.code} · ${COURSE_TYPE_LABELS[course.courseType]}）`,
                value: course.id,
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="classId" label="授课班级" rules={[{ required: true, message: '请选择班级' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择班级（自动带出人数）"
              options={classes.map((group) => ({
                label: `${group.name}（${group.studentCount} 人）`,
                value: group.id,
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="location" label="上课地点">
            <Input placeholder="例如 A101 制图室" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="weekday" label="星期" rules={[{ required: true, message: '请选择星期' }]}>
            <Select options={WEEKDAY_OPTIONS} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="startSection" label="开始节次" rules={[{ required: true, message: '请填写开始节次' }]}>
            <InputNumber min={1} max={12} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="endSection"
            label="结束节次"
            dependencies={['startSection']}
            rules={[
              { required: true, message: '请填写结束节次' },
              ({ getFieldValue }) => ({
                validator: (_rule, value: number) =>
                  !value || value >= getFieldValue('startSection')
                    ? Promise.resolve()
                    : Promise.reject(new Error('结束节次不能早于开始节次')),
              }),
            ]}
          >
            <InputNumber min={1} max={12} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="weekStart" label="起始周" rules={[{ required: true, message: '请填写起始周' }]}>
            <InputNumber min={1} max={MAX_WEEKS} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="weekEnd"
            label="结束周"
            dependencies={['weekStart']}
            rules={[
              { required: true, message: '请填写结束周' },
              ({ getFieldValue }) => ({
                validator: (_rule, value: number) =>
                  !value || value >= getFieldValue('weekStart')
                    ? Promise.resolve()
                    : Promise.reject(new Error('结束周次不能早于开始周次')),
              }),
            ]}
          >
            <InputNumber min={1} max={MAX_WEEKS} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="weekParity" label="单双周" rules={[{ required: true, message: '请选择单双周' }]}>
            <Select options={PARITY_OPTIONS} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="totalHours" label="总学时" rules={[{ required: true, message: '请填写总学时' }]}>
            <InputNumber min={0.5} max={2000} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="studentCount" label="班级人数" rules={[{ required: true, message: '请填写班级人数' }]}>
            <InputNumber min={1} max={300} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="repeatIndex"
            label="重复课次序"
            tooltip="同一学期同一课程第几次授课，第 2 次起按 0.9 折算"
            rules={[{ required: true, message: '请填写重复课次序' }]}
          >
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="remark" label="备注">
            <Input placeholder="选填，例如 合班教学、单周上课等" />
          </Form.Item>
        </Col>
      </Row>

      <TaskPreviewBox preview={preview} />
    </FormModal>
  )
}

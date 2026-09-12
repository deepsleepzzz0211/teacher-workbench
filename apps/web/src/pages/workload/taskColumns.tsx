import { Button, Divider, Flex, Popover, Tag, Typography } from 'antd'

import {
  COURSE_TYPE_LABELS,
  type CourseType,
  explainTaskCalculation,
  type TeachingTask,
  WEEK_PARITY_LABELS,
  WEEKDAY_LABELS,
} from '@tw/shared'

import type { Columns } from '@/components/blocks'

interface TaskColumnHandlers {
  onEdit: (task: TeachingTask) => void
  onDelete: (task: TeachingTask) => void
}

export function buildTaskColumns({ onEdit, onDelete }: TaskColumnHandlers): Columns<TeachingTask> {
  return [
    { title: '课程名称', dataIndex: 'courseName', width: 180, fixed: 'left' },
    {
      title: '课程类型',
      dataIndex: 'courseType',
      width: 110,
      render: (value: CourseType) => <Tag color="blue">{COURSE_TYPE_LABELS[value]}</Tag>,
    },
    { title: '授课班级', dataIndex: 'className', width: 190 },
    { title: '人数', dataIndex: 'studentCount', width: 72, align: 'right' },
    {
      title: '上课时间',
      key: 'slot',
      width: 150,
      render: (_, task) =>
        `${WEEKDAY_LABELS[task.weekday - 1] ?? ''} 第 ${task.startSection}-${task.endSection} 节`,
    },
    {
      title: '周次',
      key: 'weeks',
      width: 120,
      render: (_, task) => `${task.weekStart}-${task.weekEnd} 周 · ${WEEK_PARITY_LABELS[task.weekParity]}`,
    },
    { title: '地点', dataIndex: 'location', width: 140, render: (value: string) => value || '—' },
    { title: '总学时', dataIndex: 'totalHours', width: 88, align: 'right' },
    {
      title: '折算学时',
      dataIndex: 'effectiveHours',
      width: 100,
      align: 'right',
      render: (value: number) => <Typography.Text strong>{value.toFixed(1)}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      fixed: 'right',
      render: (_, task) => {
        const detail = explainTaskCalculation({
          totalHours: task.totalHours,
          courseType: task.courseType,
          studentCount: task.studentCount,
          repeatIndex: task.repeatIndex,
        })
        return (
          <Flex gap={4}>
            <Popover
              title="折算过程"
              content={
                <div style={{ lineHeight: 1.9, fontSize: 12 }}>
                  <div>总学时：{detail.totalHours} 学时</div>
                  <div>
                    课程类型系数：{detail.typeCoefficient.toFixed(2)}（{COURSE_TYPE_LABELS[task.courseType]}）
                  </div>
                  <div>
                    班级规模系数：{detail.classSizeFactor.toFixed(2)}（{task.studentCount} 人）
                  </div>
                  <div>
                    重复课系数：{detail.repeatFactor.toFixed(2)}
                    {task.repeatIndex > 1 ? `（第 ${task.repeatIndex} 次授课）` : '（首次授课）'}
                  </div>
                  <Divider style={{ margin: '6px 0' }} />
                  <div>
                    折算学时 = {detail.totalHours} × {detail.typeCoefficient.toFixed(2)} ×{' '}
                    {detail.classSizeFactor.toFixed(2)} × {detail.repeatFactor.toFixed(2)} ={' '}
                    <strong>{detail.effectiveHours} 学时</strong>
                  </div>
                </div>
              }
            >
              <Button size="small" type="link">
                规则
              </Button>
            </Popover>
            <Button size="small" type="link" onClick={() => onEdit(task)}>
              编辑
            </Button>
            <Button size="small" type="link" danger onClick={() => onDelete(task)}>
              删除
            </Button>
          </Flex>
        )
      },
    },
  ]
}

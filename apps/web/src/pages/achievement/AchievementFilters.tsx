import type { ReactNode } from 'react'

import { ReloadOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Flex, Select } from 'antd'
import type { Dayjs } from 'dayjs'

import type { AchievementCategory, AchievementLevel } from '@tw/shared'

import { CATEGORY_OPTIONS, LEVEL_OPTIONS } from './options'

interface AchievementFiltersProps {
  category: AchievementCategory | undefined
  level: AchievementLevel | undefined
  range: [Dayjs, Dayjs] | null
  onCategoryChange: (value: AchievementCategory | undefined) => void
  onLevelChange: (value: AchievementLevel | undefined) => void
  onRangeChange: (value: [Dayjs, Dayjs] | null) => void
  onReset: () => void
}

export function AchievementFilters({
  category,
  level,
  range,
  onCategoryChange,
  onLevelChange,
  onRangeChange,
  onReset,
}: AchievementFiltersProps): ReactNode {
  return (
    <Card>
      <Flex gap={12} wrap align="center">
        <Select
          allowClear
          placeholder="成果类别"
          style={{ width: 160 }}
          value={category}
          onChange={onCategoryChange}
          options={CATEGORY_OPTIONS}
        />
        <Select
          allowClear
          placeholder="成果级别"
          style={{ width: 140 }}
          value={level}
          onChange={onLevelChange}
          options={LEVEL_OPTIONS}
        />
        <DatePicker.RangePicker
          value={range}
          onChange={(value) => onRangeChange(value as [Dayjs, Dayjs] | null)}
          placeholder={['开始日期', '结束日期']}
        />
        <Button icon={<ReloadOutlined />} onClick={onReset}>
          重置
        </Button>
      </Flex>
    </Card>
  )
}

import type { TableProps } from 'antd'

export type Columns<T> = NonNullable<TableProps<T>['columns']>

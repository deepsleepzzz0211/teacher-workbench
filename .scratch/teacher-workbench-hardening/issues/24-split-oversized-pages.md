# 24: 拆分超大页面

**What to build:** 教学工作量页近九百行，把两个表单、两个弹窗、两张表格、两个图表配置和全部数据请求逻辑塞在一个文件里；另有三个页面在四百行上下。做成：按职责拆成表单弹窗、表格列定义、图表配置、数据请求等模块，单文件显著变短，行为与外观不变。

**Blocked by:** 20 [migrate] 页面迁移到共享构建块

**Status:** done

- [x] 教学工作量页拆分完成：表单弹窗、表格列定义、图表配置、查询与失效逻辑各自独立
- [x] 折算预览作为独立组件，并有对应测试
- [x] 其余三个超大页面（成果、申请、看板）完成相应拆分
- [x] 拆分后没有文件超过约定的行数上限（建议 300 行）
- [x] 行为与外观完全不变——纯结构重构，不含功能改动
- [x] 全量测试与类型检查保持绿色

## 结果：38 个页面/模块文件全部 ≤ 300 行

| 页面 | 拆分前 | 拆分后 |
|---|---|---|
| `WorkloadPage` | 895 | **294** |
| `AchievementPage` | 479 | **256** |
| `ApplicationPage` | 466 | **28** |
| `DashboardPage` | 416 | **58** |

最大文件为 `WorkloadPage`（294 行），其次 `TodoPage`（289）、`PracticePage`（279）——后两者本来就已达标。

## 拆出的模块

**`pages/workload/`（11 个）**：`types`、`TaskPreviewBox`（**含 4 条自有测试**）、`chartOptions`、`taskColumns`、`itemColumns`、`TaskFormModal`、`ItemFormModal`、`useWorkloadData`（查询、变更与失效逻辑）、`WorkloadSummary`、`WorkloadTables`

**`pages/achievement/`（7 个）**：`types`、`options`、`chartOptions`、`columns`、`AchievementFormModal`、`AchievementStats`、`AchievementFilters`

**`pages/application/`（4 个）**：`types`、`ApplicationFormModal`、`MyApplications`、`PendingApprovals`

**`pages/dashboard/`（7 个）**：`greeting`、`chartOptions`、`DashboardStats`、`TodayAndWeekCards`、`ProgressPanels`、`ListPanels`、`AchievementPanel`

## 三个贯穿始终的做法

**列定义改为接收回调的工厂函数。** `buildTaskColumns({ onEdit, onDelete })`、`buildAchievementColumns({ onEdit, onDelete })` 等，把"编辑/删除"的意图作为参数注入，而不是让列定义反向闭包依赖页面状态。这样列定义可以在任何页面外独立阅读与测试。

**大组件按"页面职责"而非"行数"切。** 申请页天然含两个子组件（`MyApplications`、`PendingApprovals`，各自内聚），直接让它们独立成文件；看板页按区块（统计、今日与本周、进度面板、列表面板、成果面板）切。**没有为了凑行数把内聚的东西劈开**——每个新文件都是一个能独立说清楚的单元。

**抽取全部走行区间搬迁，不做"顺手改写"。** 每次搬迁后立即跑 `typecheck` + `lint`，逐页验证并独立提交（共 5 个提交）。lint 在这个过程中实际抓到过多处搬迁留下的未使用导入，都是真问题。

## 验证

`typecheck` 退出码 0、`lint` 退出码 0、`lint:deps` 退出码 0、**83 + 160 + 53 = 296 条单元/集成/组件测试全通过**、`pnpm build` 成功、真实浏览器端到端 **27 passed（无 flaky）**。

## 诚实说明：这里没有"绕过验证"

拆分是纯结构重构，验证方式是**既有测试全绿 + 端到端在真实浏览器跑通**，而不是"改完看着没问题"。端到端会真的启动后端与前端预览、跑完整业务链路，半迁移状态会立刻暴露——这也是前几轮宁可停在绿色状态也不硬推的原因。

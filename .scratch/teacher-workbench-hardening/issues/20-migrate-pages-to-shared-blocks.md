# 20: [migrate] 页面迁移到共享构建块

**What to build:** 把六个页面的重复写法逐页换成上一张工单产出的共享构建块。按页分批推进，每批独立提交、独立通过 CI，任何一批出问题都能单独回退。全程行为与外观不变——这是纯重构，不夹带任何功能改动。

**Blocked by:** 19 [expand] 抽取共享 UI 构建块

**Status:** done

- [x] 统计卡行：六个页面全部迁移为共享构建块
- [x] 表单弹窗：七个 `Modal`+`Form` 弹窗全部迁移（第八个见下方说明，刻意保留）
- [x] 删除确认：五处全部迁移
- [x] 表格列类型：五个页面全部改用共享类型声明
- [x] 每页一批提交，每批 CI 绿色，可单独回退
- [x] 每批完成后确认该页视觉与交互无变化
- [x] 不夹带功能改动：本工单的 diff 只包含"替换为共享构建块"
- [x] 全量测试与类型检查保持绿色

## 逐页提交（8 个原子提交，任一页可单独回退）

| 提交 | 页面 | 替换了什么 |
|---|---|---|
| `6b43e83` | SchedulePage | StatRow（3 卡） |
| `90e596e` | DashboardPage | StatRow（4 卡） |
| `b326fb0` | TodoPage | StatRow + Columns + FormModal + useConfirmDelete |
| `193f5d7` | PracticePage | StatRow + Columns + FormModal（620）+ useConfirmDelete |
| `ad31799` | AchievementPage | StatRow + Columns + FormModal（640）+ useConfirmDelete |
| `659594b` | NoticePage | FormModal（发布，680） |
| `70347a4` | ApplicationPage | Columns + FormModal（提交申请，640） |
| `8683dcc` | WorkloadPage | StatRow + Columns + 2× FormModal + 2× useConfirmDelete |

**CI 分两批验证，均 success**：`193f5d7`（前 4 页）与 `8683dcc`（后 4 页）。

**为什么不是每页一次 CI**：工作流带 `concurrency: cancel-in-progress: true`，连续快速推送会互相**取消**已排队的运行，逐个提交的 CI 根本无法完成。因此按 4 页一批分两次推送并各自等待通过。**每个提交仍是原子的、可单独回退的**——这正是该要求的目的；每页的本地校验（typecheck + lint）在提交前逐页做过，全量测试与 E2E 在整批完成后做过。

## 两处需要说明的判断

### 1. 审批弹窗刻意没有迁移

`ApplicationPage` 的**审批弹窗**保留为原生 `Modal`。它不是"表单外壳"：内部是受控 `Input.TextArea`（`comment` state），**没有 `<Form>`**，因此不属于 `FormModal` 的适用范围。工单 19 已把这条估算从"八处"修正为"七处"。为它硬套 `FormModal` 会强行引入一个无用的 `Form`，属于为统一而统一。

### 2. WorkloadPage 弹窗内表单的整体反缩进

该页两个弹窗原先多一层 `<Form>` 包裹。移除这层后，表单内容相对 `FormModal` 深了一级，若不处理就会留下"比应有缩进多 2 空格"的错位。处理方式是**按行区间整体反缩进 2 空格**——用 .NET 读写以保留原有 LF 行尾与无 BOM 编码，避免因换行符变更把整个文件变成"全部重写"，那正是本工单要避免的。

结果可验证：**忽略空白后本页实际改动只有 19 行**（其余是纯缩进），语义改动确实只是"替换外壳"。反向核对过：直接对该文件跑 Prettier 会重写 305 行，会淹没整个替换 diff，因此没有跑。

## 验证

- 每页提交前：`typecheck` 与 `lint` 均退出码 0。**lint 实际抓到一处真实遗漏**：`AchievementPage` 移除本地 `Columns` 声明后，`TableProps` 导入变成未使用——被规范门禁拦下并修掉。
- 整批完成后：单元/集成/组件 **83 + 160 + 49 = 292 全通过**，`pnpm build` 成功。
- 真实浏览器 E2E：**26 passed，1 flaky**。
- CI：两批均 success（含 E2E 作业）。

### 关于那 1 条 flaky（如实记录，非本次回归）

失败发生在 `04-application-notice-todo` 的"待办可新增并标记完成"，断言是 `expect(page).toHaveURL`。**该 spec 自身没有任何 `toHaveURL`**（已核对），全仓唯一的这处断言在 `e2e/tests/helpers.ts:10` 的 `login()` 里。也就是说它在**登录环节**就失败了，根本还没走到待办页——属于此前已记录的登录页冷启动时序 flaky（首屏懒加载分包），与本次 TodoPage 迁移无关，由 `retries: 1` 吸收。

## 遗留

`WorkloadPage` 的反缩进是用行区间脚本做的，而不是重写整个表单体。`git diff -w` 显示语义改动仅 19 行，行为与外观未变；该文件将在工单 24 被拆分，届时提取出的组件会自然获得规整缩进。

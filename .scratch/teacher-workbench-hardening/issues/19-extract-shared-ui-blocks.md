# 19: [expand] 抽取共享 UI 构建块

**What to build（第一步：并存，不替换）:** 六个页面各自复制了同样的统计卡行；八个弹窗复制了同样的表单外壳；五处复制了同样的删除确认；五个页面重复声明了同样的表格列类型。这些重复是后续无障碍、脏数据保护、主题化三条线改动量翻倍的根源——改一处要改六到八处。做成：新增共享构建块，**与现有实现并存，本轮不替换任何调用点**，CI 保持绿色。

**Blocked by:** 03 代码规范工具接入

**Status:** done

- [x] 四个共享构建块就位，接口覆盖现有重复写法的全部用法（含自定义校验、异步提交、条件插槽）
- [x] 现有页面一行未改，行为与外观完全不变
- [x] 共享构建块自身有组件测试
- [x] 共享构建块的样式与间距和现有页面一致，视觉无差异
- [x] CI 保持绿色（expand 阶段硬性要求：新旧并存，随时可回退）
- [x] 记录每个构建块将替代的重复位置清单，供下一张工单使用

## 新增的四个构建块

目录 `apps/web/src/components/blocks/`，由 `index.ts` 统一导出。**本轮没有改动任何一个页面**——纯新增。

| 文件 | 构建块 | 作用 |
|---|---|---|
| `columns.ts` | `Columns<T>` | 表格列类型，替代五处重复声明 |
| `StatRow.tsx` | `StatRow` | 统计卡行，按卡片数自动套用与现状一致的栅格 |
| `FormModal.tsx` | `FormModal<T>` | 弹窗 + 表单外壳（标题、提交态、异步提交、`onValuesChange`） |
| `useConfirmDelete.ts` | `useConfirmDelete` | 标准危险删除确认（删除/取消文案与 danger 样式统一） |

**`StatRow` 的栅格是按卡片数查表**，而不是用 `24 / 张数` 套公式——因为现状并非等分：三张卡是 `xs24 sm8`，四张卡是 `xs24 sm12 xl6`（窄屏两列、宽屏四列）。用公式会改变视觉，违背"外观完全不变"。三张与四张的栅格类名都有测试断言。

## 给下一张工单（20）的替换清单

### `Columns<T>` → 5 处

| 文件 | 行 |
|---|---|
| `WorkloadPage.tsx` | 56 |
| `PracticePage.tsx` | 41 |
| `TodoPage.tsx` | 42 |
| `ApplicationPage.tsx` | 44 |
| `AchievementPage.tsx` | 50 |

### `StatRow` → 6 处

| 文件 | 行 | 卡片数 | 现有栅格 |
|---|---|---|---|
| `DashboardPage.tsx` | 92 | 4 | `xs24 sm12 xl6` |
| `WorkloadPage.tsx` | 540 | 4 | `xs24 sm12 xl6` |
| `AchievementPage.tsx` | 330 | 4 | `xs24 sm12 xl6` |
| `SchedulePage.tsx` | 103 | 3 | `xs24 sm8` |
| `PracticePage.tsx` | 187 | 3 | `xs24 sm8` |
| `TodoPage.tsx` | 240 | 3 | `xs24 sm8` |

### `FormModal` → 7 处（**注意：不是原估的 8 处**）

| 文件 | 行 | 标题 | okText | width |
|---|---|---|---|---|
| `WorkloadPage.tsx` | 660 | 新增/编辑授课任务（动态） | 保存 | 760 |
| `WorkloadPage.tsx` | 814 | 新增其它工作量 | 保存 | — |
| `TodoPage.tsx` | 277 | 新增待办 | 保存 | — |
| `PracticePage.tsx` | 247 | 登记实践经历 | 保存 | 620 |
| `NoticePage.tsx` | 233 | 发布通知 | 发布 | 680 |
| `ApplicationPage.tsx` | 218 | 发起调课 / 请假申请 | 提交申请 | 640 |
| `AchievementPage.tsx` | 426 | 登记新成果/编辑成果（动态） | 保存 | 640 |

**修正一处工单估算**：原描述说"八个弹窗复制了同样的表单外壳"，实际只有 **7 个**弹窗是 `Modal` + `Form` 外壳。第 8 个是 `ApplicationPage.tsx:412` 的**审批弹窗**——它是 `Modal` + 受控 `Input.TextArea`（用 `comment` state），**内部没有 `<Form>`**，因此 `FormModal` 覆盖不到它。这是纯 `Modal` 外壳，若要统一应另立一个更薄的块，不要硬塞进 `FormModal`。

两处标题与一处 okText 是动态的（`editingTask ? '编辑…' : '新增…'`、`reviewTarget?.decision === 'approved' ? … : …`），`FormModal` 的 `title` / `okText` 都是普通字符串，迁移时由调用方自行求值后传入。

### `useConfirmDelete` → 5 处

| 文件 | 行 | 标题 |
|---|---|---|
| `WorkloadPage.tsx` | 355 | 删除授课任务 |
| `WorkloadPage.tsx` | 366 | 删除工作量记录 |
| `TodoPage.tsx` | 135 | 删除待办 |
| `PracticePage.tsx` | 107 | 删除企业实践记录 |
| `AchievementPage.tsx` | 234 | 删除成果记录 |

五处的 `onOk` 都是 `() => 某 mutation.mutateAsync(id)`，与块的 `onConfirm` 签名一致。

## 构建块接口覆盖到的现有用法

- **自定义校验**：`Form.Item` 的 `rules`（含跨字段校验，如结束周不得早于开始周）留在 `children` 里，`FormModal` 不干预。
- **异步提交**：`onSubmit` 接受 `void | Promise<void>`；提交态由调用方以 `submitting` 传入（与现状的 `mutation.isPending` 一致），未改用 Modal 的自动 loading，以免行为变化。
- **条件插槽**：`children` 与 `width` 可选；危险确认的 `onConfirm` 直接承接 `mutateAsync`。
- **未保存守卫**：`FormModal` 的 `onClose` 由调用方自行包 `guard.requestClose`，块本身不耦合守卫，保持现状行为。

## 测试

`apps/web/src/components/blocks/blocks.test.tsx`，**10 条**用例全部通过：

- `StatRow`：渲染全部卡片；三张卡栅格为 `xs24 sm8`；四张卡为 `xs24 sm12 xl6`。
- `FormModal`：渲染标题与表单内容；取消关闭弹窗并交回调用方；保存触发提交；提交中保存按钮进入加载态；表单值变化向外抛出（供折算预览使用）。
- `useConfirmDelete`：弹出确认框且删除按钮带 `ant-btn-dangerous` 危险样式，确认后回调；取消时不回调。

`Columns<T>` 是纯类型，没有运行时行为，因此无测试——这是类型系统自身保证的部分。

写测试时修掉了两处**测试自身**的问题（不是构建块的问题）：提交中按钮的可见名称会因加载图标而变化，改用弹窗根节点内的 `.ant-btn-loading` 断言；确认框标题会被 AntD 渲染成"外层容器 + 内层 span"两层同文本，改用 `within(dialog)` 收窄作用域。

## 关于"视觉无差异"

本轮页面一行未改，所以不存在视觉回归的可能。构建块与现状的一致性通过两件事保证：一是 `StatRow` 的栅格查表复刻了现有的两种取值（有测试断言），二是 `FormModal` 逐项对应当前 `Modal` 的全部属性（`destroyOnHidden`、`okText`/`cancelText` 默认值、`width` 可选）。

**真正需要逐页截图比对的时点是工单 20 迁移调用点之后**——那时才可能引入视觉差异。这一点已如实留到那时验证。

# 21: [contract] 删除重复的旧写法

**What to build:** 迁移完成后，页面内已经没有任何调用点还依赖旧的重复写法。删除这些残留，让重复代码归零，避免后来者照着旧写法再复制一份。

**Blocked by:** 20 [migrate] 页面迁移到共享构建块

**Status:** done

- [x] 页面内的重复统计卡行写法全部删除
- [x] 页面内的重复表单弹窗外壳全部删除
- [x] 页面内的重复删除确认实现全部删除
- [x] 页面内的重复表格列类型声明全部删除
- [x] 全仓库搜索确认无残留调用点（以构建与类型检查的通过作为硬证据）
- [x] 全量测试与类型检查保持绿色
- [x] 变更只包含删除，不含行为改动

## UI 重复写法：已经是零，不需要额外删除

工单 20 采用的是**就地替换**而不是"新增后并存"，所以迁移落地的那一刻，旧写法就已经从页面里消失了——本条没有额外代码要删。用搜索把这一点变成可核对的证据：

| 检查项 | 现状 |
|---|---|
| `type Columns<T> =` 本地声明 | 仅剩 `components/blocks/columns.ts` 一处 |
| `modal.confirm(` 手写删除确认 | 仅剩 `components/blocks/useConfirmDelete.ts` 一处 |
| `okButtonProps: { danger: true }` | 仅剩上面同一处 |
| 统计卡行的 `xs24 sm8` / `xs24 sm12 xl6` 栅格 | **0 处** |

唯一一处仍然手写 `danger` 确认的是 `hooks/useUnsavedChanges.tsx` 的**「放弃修改」守卫**——它是丢掉未保存改动，不是删除记录：文案是"放弃修改 / 继续编辑"，驱动的是内部 `pendingClose` 状态而非 mutation。语义不同，**刻意不并入 `useConfirmDelete`**。

## 顺带清掉真正的死代码（4 处）

工单 17 把 knip 的导出检查推迟到"宽重构收口"，这里就是收口点。**动手前先逐一核对调用点**，因为 knip 的这份清单并不全对（见下）：

| 位置 | 判定依据 |
|---|---|
| `assertOwned`（`services/common.ts`） | 全仓 0 引用；各模块都是就地做归属校验 |
| `requireRole`（`plugins/auth.ts`） | 全仓 0 引用；实际用的是同文件的 `assertRole` |
| `UnreadBadge`（`components/PageHeader.tsx`） | 全仓 0 引用（连带移除已无用的 `Badge` 导入） |
| `conflict`（`utils/http.ts`） | 全仓 0 引用；各模块从不构造 409 |

同时删掉 `services/common.ts` 末尾的三行转发导出（`export { and, eq }`、`export { badRequest }`）——各模块都是从 `drizzle-orm` 与 `utils/http` 直接引入的，从未经由这里。连带去掉因此变成未使用的 `and`、`badRequest` 两个导入。删除后复核：这 4 个符号全仓残留均为 **0**。

另外把我自己在工单 19 里导出、但无人引用的两个类型（`FormModalProps`、`ConfirmDeleteOptions`）收回为文件内局部类型——它们只在该文件内使用。

## 重要：knip 有误报，不能照单全删

核对时发现 knip 把**仍在使用的 API** 也报成了未使用：

- `achievementCreateSchema` 被 `packages/shared/test/schemas.test.ts` 与 `apps/api/src/modules/achievement.ts:136` 使用；
- `workloadItemCreateSchema` 被 `apps/api/src/modules/workload.ts:277` 使用。

它们出现在"Duplicate exports"里只是因为 `xxxCreateSchema` 是 `xxxBaseSchema` 的别名（同一个对象两个名字），**并非死代码**。**如果照单删除，会直接删掉正在工作的校验入口。** 这两个都保留。

## 为什么 knip 的导出检查不进 CI

清完之后 knip 仍报 12 个未使用导出与 4 个未使用类型，逐条核对后都属于**仅在自身文件内使用**的内部辅助（如 `loadEnv`、`toAuthUser`、`ensureTermCourseClass`、`getDepartmentOf`、测试辅助 `setupDatabase` / `createTestApp` / `login`、`DEMO_PASSWORD` 等）。多导出几个关键字无害，但把它们全部收回是 18 处跨 10 文件的纯关键字改动，收益极低。

因此 **CI 的 knip 门禁仍只覆盖依赖卫生**（工单 17 的设定），导出检查保留为按需命令（`pnpm exec knip --exports`）。不纳入门禁的理由是具体的：它会对合法 API 面产生误报（上面的 schema 别名、`PRIMARY`、组件 props 类型），而消除误报需要额外配置测试入口或逐条打 `@public` 标记——**在没有误报治理之前，把它设成硬门禁只会训练人忽略它**。

## 验证

`typecheck` 退出码 0、`lint` 退出码 0、`lint:deps` 退出码 0、单元/集成/组件 **83 + 160 + 49 = 292 全通过**、`pnpm build` 成功。

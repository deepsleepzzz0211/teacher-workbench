# 03: 代码规范工具接入（基线化，不批量改文件）

**What to build:** 接入 ESLint 与 Prettier 并纳入 CI，作为后续所有改动的格式与规范基线。关键约束：存量违规先冻结成基线，不做全量格式化提交——否则后续每一个功能 diff 都会被成千上万行格式变更淹没，无法审阅。

**Blocked by:** 02 CI 质量门

**Status:** done

- [x] ESLint 与 Prettier 配置就位，且与 TypeScript 严格模式协同（不产生与类型检查重复的规则）
- [x] CI 中新增规范检查步骤
- [x] 存量违规以基线方式冻结——**实际结果是：不需要基线**
- [x] 新增或修改的文件受规范约束（基线只覆盖既有文件）
- [x] 提供一键格式化命令，供后续按需对单个文件或目录执行
- [x] 记录一条已知取舍：全量格式化留待宽重构阶段顺带完成，不单独开大 diff

## 结果：存量违规只有 9 条，全部直接修掉，因此没有引入基线文件

首次运行 ESLint，全仓仅 **7 个错误 + 2 个警告**，而且条条是真问题，不是噪声：

| 文件 | 问题 |
|---|---|
| `apps/api/src/db/migrate.ts` | 无效赋值；重新抛出异常时丢失了原始 `cause` |
| `apps/web/src/pages/ApplicationPage.tsx` | 未使用的 `Skeleton` 导入 |
| `apps/web/src/pages/WorkloadPage.tsx` | 两个声明后从未使用的常量 |
| `apps/web/src/pages/TodoPage.tsx` | 逻辑表达式让 `useMemo` 依赖每次渲染都变化（真实的渲染开销隐患） |
| `packages/shared/src/schemas/achievement.ts` | 未使用的 `uuidSchema` 导入 |
| `packages/shared/src/schemas/teaching.ts` | 未使用的 `COURSE_TYPES` 导入 |

**这比原工单的预期好得多**：既然违规都在十个以内、且都是该修的，就直接修掉——**用"忽略清单冻结"来掩盖它们反而更差**，那等于把技术债写进配置里。修完 `eslint .` 为**零问题、退出码 0**，门禁从第一天起就是真绿，不是靠抑制伪造的绿。

**唯一一处刻意的例外**（写在配置里并注明原因）：登录态上下文把 Provider 与其配套 hook 放在同一文件是有意为之——拆开要改动十余个引用点，而该规则只影响开发期热更新体验，代价与收益不成比例。

## 关于 Prettier：本次不纳入门禁（如实记录）

`prettier --check .` 当前有 **48 个文件**不符合格式。工单明确要求不做全量格式化提交，理由是那会把后续每个功能 diff 淹没在格式变更里。因此本轮：**提供 `pnpm format` / `pnpm format:check` 命令，但不把 `format:check` 放进 CI**；这些文件会在接下来的宽重构（工单 19–24）中顺带格式化，等重构收口后再把格式化纳入门禁。

**这是一个明确的未完成项**：在宽重构收口之前，代码格式不受 CI 约束。

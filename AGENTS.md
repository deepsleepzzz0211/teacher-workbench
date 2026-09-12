# 教师工作台 — 协作 agent 说明

高职院校教师个人工作台。前后端分离：`apps/web`（React 19 + Ant Design 5 + Vite）、`apps/api`（Fastify 5 + Drizzle + PostgreSQL 15）、`packages/shared`（Zod 契约与领域逻辑）、`e2e`（Playwright）。

日常入口命令是 `pnpm dev` / `pnpm test` / `pnpm e2e`，其余见 `package.json`。

## 代码里的隐性约定

**业务规则只有一处实现。** 课时折算（课程类型系数 × 班级规模系数 × 重复课系数）与全部枚举、标签文案都在 `packages/shared`。前端表单的实时预览与后端入库调用的是同一个函数，所以两边结果必然一致。调整规则改这里，不要在页面或接口里另写一份。

**跨层数据一律经 `packages/shared` 的 Zod 契约校验**，前后端共用同一份 schema，接口形状因此不会与实现漂移。

**开发期直接用 tsx 运行源码，但后端也有真实产物。** `pnpm dev` / `pnpm start` 走 tsx，改后端不需要先构建，本地体验不变；`pnpm --filter @tw/api build` 另外用 esbuild 产出 `apps/api/dist/`（`server.js` 与三个数据库入口），可用 `node dist/server.js` 直接启动，**不需要 TypeScript 运行时**。第三方依赖保持外部引用（由 node_modules 提供），但 `@tw/shared` 必须内联——它的 `exports` 指向 `.ts` 源码，Node 运行时加载不了。运行产物时注意迁移目录仍指向 `apps/api/drizzle`，所以产物要留在 `apps/api/dist` 下（`outbase=src` 保证了这一点）。

**集成测试跑在独立的 `*_test` 库上**，测试文件启动时会重建 public schema。测试辅助里带安全阀：连到非 `_test` 库会立刻报错。这是防呆设计，不要绕过。

**端到端测试跑生产预览而非 dev server。** `pnpm e2e` 会先构建再 preview，因为 dev server 首次加载会触发依赖预构建重载、造成偶发连接中断。端口被占用时 Playwright 会**直接报错**、不会悄悄复用别的服务——所以跑 e2e 前先停掉 dev server。

**`pnpm e2e` 会先应用迁移、再重置演示数据**，本地手工改过的数据会被清掉；正因如此，它在全新的数据库（首次克隆、CI 的服务容器）上也能自足运行。

**CI 是强制的质量门。** 推送与 PR 都会依次执行 `typecheck` → `lint` → 未使用依赖检查 → `test` → `build`，随后**实际启动后端产物并断言健康检查**，全部通过后才跑端到端；任一步失败即整体失败、后续步骤不再执行。所以提交前至少本地跑一遍 `pnpm typecheck`、`pnpm lint` 与 `pnpm test`。

**数据库默认假设本机已有对应角色与两个库**，连接信息在 `.env`。换机器要改 `.env`，并确认测试库同样存在。

## 工单（issue tracker）

工单是本地文件，位于 `.scratch/<批次>/issues/`，一个工单一个文件，按依赖顺序编号，前置在前。

- 当前批次：`.scratch/teacher-workbench-hardening/issues/`
- 每个工单头部的 **Blocked by** 就是阻塞边。
- 只领取**前沿**工单：没有 Blocked by，或其列出的前置全部已完成，按编号从小到大。
- 状态词表：`ready-for-agent`（可领取，新工单默认）、`in-progress`、`blocked`、`done`。流转方式是不改文件名，只改工单头部的 `**Status:**` 行。
- 完成一张工单时，逐项勾选其验收清单，再改状态；不要顺手改动其它工单。
- 宽重构三张（19 → 20 → 21）走 expand–migrate–contract：先并存新增、再分批迁移、最后删除旧写法。**每个阶段都必须保持 CI 绿色**，不要把阶段合并成一次提交。

## 文档

需求规格 → `docs/REQUIREMENTS.md`。架构、数据模型与接口清单 → `docs/ARCHITECTURE.md`。运行方式、演示账号与测试策略 → `README.md`。

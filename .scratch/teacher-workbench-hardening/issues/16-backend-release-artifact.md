# 16: 后端可发布产物

**What to build:** 后端没有任何编译产物——所谓的构建命令只做类型检查，运行始终依赖开发期的 TypeScript 运行时和完整源码目录。这意味着"构建通过"并不代表得到一个能部署的东西。做成：构建产出一个可用 `node` 直接启动的后端产物，不含开发依赖，CI 验证它能起来并通过健康检查。

**Blocked by:** 02 CI 质量门

**Status:** done

- [x] 构建命令输出可运行的后端产物（JS 形式，而非仅类型检查）
- [x] 该产物可用 `node` 直接启动，不需要 TypeScript 运行时
- [x] 不经构建即可启动的开发方式仍然可用（本地开发体验不变）
- [x] CI 中新增一步：构建产物后实际启动它，并断言健康检查返回正常
- [x] 共享契约包在产物模式下能被正确解析（不再是直接引用源码）
- [x] 文档中关于构建与启动的描述与实际行为一致
- [x] 全量测试与类型检查保持绿色

## 手前先探到的两个硬阻塞

直接给 `tsc` 加 `emit` 是行不通的，动手前先确认了两件事：

1. **`@tw/shared` 的 `exports` 指向 `.ts` 源码**（`"./src/index.ts"`）。编译后的后端会 `import from '@tw/shared'`，Node 运行时解析到一个 `.ts` 文件——加载不了。
2. **`apps/api` 的相对导入全部不带扩展名**（实测带 `.js` 的为 **0 处**）。在 `"type": "module"` 下 Node ESM 要求显式扩展名，所以 `tsc` 直出的 JS 会以 `ERR_MODULE_NOT_FOUND` 收场。

第 2 点意味着：要么给全仓几十个相对导入逐个补 `.js`（大 diff、纯机械改动、易漏），要么在构建期把模块解析问题一次性解决掉。

## 采用方案：esbuild 打包，而非逐个补扩展名

用 esbuild 把后端打成 ESM 产物（`apps/api/scripts/build.mjs`）：

- **第三方依赖保持外部引用**——它们本就是生产依赖，由 `node_modules` 提供，这是 Node 部署的常规形态。没有原生模块（口令用 `node:crypto` 的 scrypt），无需特殊处理。
- **`@tw/shared` 内联进产物**——正好绕开上面第 1 个阻塞，产物不再引用 `.ts` 源码。
- **`outbase: 'src'`** 保留目录结构：`src/db/migrate.ts` → `dist/db/migrate.js`。

最后这点是关键：`migrate.ts` 用 `resolve(here, '../../drizzle')` 定位 SQL 文件，而 SQL 不进产物。保持 `dist/db/` 这个层级后，**`../../drizzle` 依然指向 `apps/api/drizzle`，迁移逻辑一行都不用改**。

产物：`dist/server.js`（73 kB）与 `db/migrate.js`、`db/seed.js`、`db/reset.js` 三个入口，外加 sourcemap。

开发体验不变：`pnpm dev` / `pnpm start` 仍走 tsx，改后端不需要先构建。新增 `start:prod` = `node dist/server.js`。

## 验证（都实跑过，不是推断）

1. **`node dist/server.js` 用纯 node 启动成功**，`/health` 返回 `HTTP 200 {"status":"ok","env":"development"}`。
2. **`node dist/db/migrate.js` 独立运行成功**，输出「数据库结构已是最新，无需迁移」——这一条同时证明了 bundled 模式下 `../../drizzle` 的路径解析是对的，以及 `@tw/shared` 内联没有破坏迁移器。
3. **产物不引用任何开发依赖**：`tsx` / `typescript` / `vitest` / `esbuild` 的引用数均为 **0**。
4. 构建前确认了 `/health` 是静态响应、`buildApp` 启动期不访问数据库，因此 CI 里这一步不依赖数据库可用。

## CI

`quality` 任务在「构建」之后新增「验证后端产物可独立启动」：后台拉起 `node dist/server.js`，最多轮询 30 秒断言 `/health`，失败则打印产物日志并退出 1。这样"构建通过但根本起不来"不再可能溜过去。

## 文档修正

`AGENTS.md` 里那句 **「后端没有编译产物。后端始终由 tsx 直接运行源码，"构建"对后端只是类型检查」** 已因本次改动变成错的，改为说明开发期仍走 tsx、但另有真实产物、以及 `@tw/shared` 必须内联和产物需留在 `apps/api/dist` 的原因。CI 步骤序列的描述也一并更新（此前还漏了 lint 与未使用依赖检查两步）。README 补充了「后端产物」小节与 `build` / `start:prod` 命令。

## 验证

`typecheck` 退出码 0、`lint` 退出码 0、`lint:deps` 退出码 0、单元/集成/组件 **83 + 160 + 39 = 282 全通过**、`pnpm build` 退出码 0 且产出上述四个入口。

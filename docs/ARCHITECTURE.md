# 架构设计

## 1. 总体结构

```
teacher-workbench/
├─ apps/
│  ├─ api/          Fastify + Drizzle + PostgreSQL 15（后端）
│  └─ web/          Vite + React 19 + Ant Design 5（前端 SPA）
├─ packages/
│  └─ shared/       Zod 契约与共享类型（前后端唯一事实来源）
├─ e2e/             Playwright 端到端测试
├─ docs/            需求与设计文档
└─ scripts/         一键启动、数据库初始化脚本
```

**为什么把契约放进 `packages/shared`**：前后端共用同一份 Zod Schema，后端的请求校验与前端表单校验、TypeScript 类型全部从它推导，避免"接口文档与实现漂移"。这是本项目唯一的事实来源。

## 2. 技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| 后端框架 | Fastify 5 | 原生支持 `inject()` 做无端口集成测试，性能好，Schema 校验生态成熟 |
| ORM | Drizzle ORM | 类型安全的 SQL-first ORM，迁移文件即纯 SQL，可读可审计；无重量级代码生成 |
| 数据库 | PostgreSQL 15 | 明确要求；使用 `jsonb`、`numeric`、`date` 等原生能力 |
| 校验 | Zod | 与 `shared` 包共用，运行期校验 + 编译期类型推导 |
| 鉴权 | `@fastify/jwt` | 无状态 JWT，配合 `preHandler` 守卫 |
| 后端测试 | Vitest + `app.inject()` | 不启端口即可跑完整 HTTP 链路，速度快、隔离好 |
| 前端框架 | React 19 + TypeScript | 要求 |
| 构建 | Vite | 冷启动快，配置简单 |
| UI | Ant Design 5 | 要求；中文语境下表单/表格/统计组件完备 |
| 数据请求 | TanStack Query v5 | 缓存、失效、加载态统一管理，减少手写 loading |
| 路由 | React Router 7 | 标准方案，路由守卫清晰 |
| 前端测试 | Vitest + Testing Library | 组件级测试，与 Vite 同配置体系 |
| 端到端 | Playwright | 跨浏览器，自动等待，trace 可回放 |

## 3. 后端分层

```
apps/api/src/
├─ app.ts              组装 Fastify 实例（可被测试直接 inject）
├─ server.ts           进程入口（listen）
├─ config/env.ts       环境变量集中解析
├─ db/
│  ├─ schema.ts        Drizzle 表定义
│  ├─ client.ts        连接池
│  ├─ migrate.ts       执行 drizzle/*.sql
│  ├─ seed.ts          演示数据
│  └─ reset.ts         重建 schema + 迁移 + 灌种子
├─ modules/            每个业务模块一个 Fastify 插件
│  ├─ auth.ts
│  ├─ catalog.ts       学期 / 课程 / 班级（教师端只读）
│  ├─ schedule.ts
│  ├─ workload.ts      授课任务 + 其它工作量 + 汇总
│  ├─ achievement.ts
│  ├─ practice.ts
│  ├─ application.ts
│  ├─ notice.ts
│  ├─ todo.ts
│  └─ dashboard.ts
├─ plugins/            横切关注点：错误处理、鉴权守卫
├─ services/common.ts  学期解析、教学周计算、单双周判断、日期工具
└─ utils/              口令哈希、HttpError、Zod 校验辅助
```

**关键原则**：业务规则的纯函数（折算、汇总、周次分布）放在 `packages/shared/src/domain/workload.ts`，不依赖 I/O，
因此可以用最细粒度、最快的单元测试锁死算法（TDD 的主战场），并且被前端复用做实时预览；
`modules/` 负责编排（取数 → 调领域函数 → 写库 → 出参），由集成测试覆盖。

## 4. 数据模型

| 表 | 说明 |
|---|---|
| `users` | 教师账号：用户名、密码哈希、姓名、工号、院系、职称、角色 |
| `terms` | 学期：名称、起止日期、是否当前学期 |
| `classes` | 班级：名称、专业、年级、人数 |
| `courses` | 课程：编码、名称、课程类型、学分、学时 |
| `teaching_tasks` | 授课任务：教师/学期/课程/班级、星期、节次、周次、总学时、重复次序 |
| `workload_items` | 其他工作量条目：类别、标题、数量、单位、折算学时 |
| `achievements` | 教科研成果：类别、标题、级别、角色、日期、分值 |
| `enterprise_practices` | 企业实践：企业、岗位、起止日期、天数 |
| `applications` | 调课/请假申请：类型、原/目标时间、事由、状态、审批人、审批意见 |
| `notices` | 通知公告：标题、正文、类别、是否置顶、发布人 |
| `notice_reads` | 通知已读关系（唯一约束：通知 × 用户） |
| `todos` | 待办：标题、截止日期、优先级、状态 |

约束与索引：`users.username` 唯一；`notice_reads(notice_id, user_id)` 唯一复合；`teaching_tasks(teacher_id, term_id)`、`achievements(teacher_id, category)`、`applications(status)`、`todos(teacher_id, status)` 建索引。

## 5. 接口约定

- 统一前缀 `/api`。
- 统一响应：成功直接返回数据体；失败返回 `{ "message": string, "code"?: string }` + 恰当 HTTP 状态码。
- 分页：`?page=1&pageSize=20`，返回 `{ items, total, page, pageSize }`。
- 鉴权：`Authorization: Bearer <token>`。

主要端点（完整清单见 `packages/shared/src/schemas`，前端封装见 `apps/web/src/api/endpoints.ts`）：

```
POST   /api/auth/login                GET  /api/auth/me

GET    /api/catalog/terms             GET  /api/catalog/courses        GET /api/catalog/classes

GET    /api/dashboard

GET    /api/schedule?termId=&week=

GET    /api/workload/summary?termId=
GET    /api/workload/tasks            POST /api/workload/tasks
PATCH  /api/workload/tasks/:id        DELETE /api/workload/tasks/:id
GET    /api/workload/items            POST /api/workload/items
DELETE /api/workload/items/:id

GET    /api/achievements              POST /api/achievements
GET    /api/achievements/stats        PATCH /api/achievements/:id
DELETE /api/achievements/:id

GET    /api/practices                 POST /api/practices             DELETE /api/practices/:id

GET    /api/applications              POST /api/applications
GET    /api/applications/pending      POST /api/applications/:id/review

GET    /api/notices                   POST /api/notices
GET    /api/notices/:id               POST /api/notices/:id/read

GET    /api/todos                     POST /api/todos
PATCH  /api/todos/:id                 DELETE /api/todos/:id
```

## 6. 核心算法：教学工作量折算

```
折算学时 = 总学时 × 课程类型系数 × 班级规模系数 × 重复课系数
```

- 课程类型系数：理论 `1.0` / 理实一体 `1.1` / 实训 `1.2` / 顶岗实习 `1.5`
- 班级规模系数：`≤40 → 1.0`；`>40 → min(1.3, 1 + (人数 − 40) × 0.01)`
- 重复课系数：同教师同学期同课程第 1 次 `1.0`，第 2 次起 `0.9`
- 结果保留 1 位小数（四舍五入）

纯函数位于 `packages/shared/src/domain/workload.ts`，其单元测试覆盖：边界人数（40/41/70 上限截断）、重复课次序、各类型系数、汇总与达成率、周次分布、未知类型回退。**先写测试，再写实现。**

因为这份实现被后端入库与前端表单预览共同调用，教师在前端看到的折算结果与最终落库结果必然一致。

## 7. 测试策略

| 层级 | 工具 | 覆盖对象 | 数据库 |
|---|---|---|---|
| 单元 | Vitest | `domain/*` 纯函数（折算、汇总） | 无 |
| 集成 | Vitest + `app.inject()` | 每个模块的 HTTP 全链路（鉴权、校验、CRUD、状态流转） | 真实 PG `teacher_workbench_test`，每个测试文件前重建 schema |
| 组件 | Vitest + Testing Library | 前端关键组件（如工作量计算展示、登录表单） | 无 |
| 端到端 | Playwright | 登录 → 看板 → 工作量录入 → 科研登记 → 申请与审批 → 通知已读 | 真实 PG `teacher_workbench` |

集成测试使用独立测试库，与开发库隔离；测试文件 `beforeAll` 执行迁移并在用例间清理业务表，保证可重复。

## 8. 配置与运行

`.env` 关键项：

```
DATABASE_URL=postgres://tw_app:tw_app_pwd_2026@127.0.0.1:5432/teacher_workbench
TEST_DATABASE_URL=postgres://tw_app:tw_app_pwd_2026@127.0.0.1:5432/teacher_workbench_test
JWT_SECRET=...
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

前端通过 Vite 代理把 `/api` 转发到 `http://localhost:3000`，避免开发期跨域配置。

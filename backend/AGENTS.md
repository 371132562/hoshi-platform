## 后端概述

后端位于 `backend/`，核心栈为 NestJS 11、TypeScript、Prisma 7、SQLite、Winston。

## 进入后端任务前先选 Skill

- 跨模块需求、需要先做验收与 TODO：先走 `/.agents/skills/project-workflow/SKILL.md`
- controller / service / dto / pipe / module 改动：先走 `/.agents/skills/create-backend-module/SKILL.md`
- Prisma schema、seed、生成客户端、数据库结构调整：先走 `/.agents/skills/prisma-workflow/SKILL.md`
- 系统日志、用户日志、操作日志链路：先走 `/.agents/skills/implement-system-log/SKILL.md`

## 先看哪里

| 任务               | 位置                                                                                                  | 说明                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 应用入口与全局装配 | `src/main.ts` `src/app.module.ts`                                                                     | 全局过滤器、拦截器、模块挂载                 |
| 统一响应结构       | `src/common/interceptors/response.interceptor.ts` `src/types/response.ts`                             | 成功响应统一 `{ code, msg, data }`           |
| 全局异常与业务错误 | `src/common/exceptions/allExceptionsFilter.ts`                                                        | `BusinessException + ErrorCode`              |
| Prisma 接入        | `src/prisma/prisma.service.ts` `src/prisma/prisma.module.ts`                                          | 所有数据库访问统一从这里走                   |
| 日志体系           | `src/common/services/winston-logger.service.ts` `src/common/interceptors/user-context.interceptor.ts` | 自动携带用户上下文                           |
| 业务模块参考       | `src/commonModules/user/*` `src/commonModules/role/*` `src/businessModules/article/*`                 | controller / service / dto / pipe 的现成模板 |

## 目录职责

```text
src/
├── businessModules/   # 业务模块
├── commonModules/     # 通用业务模块（认证、组织、角色、上传、日志等）
├── common/            # 通用基础设施（异常、拦截器、守卫、日志、工具）
├── prisma/            # Prisma 服务封装
└── types/             # 前后端共享类型与响应定义
```

## 核心约定

### 接口与模块

- 接口统一使用 **POST**，不要引入新的 REST 风格分裂现有约定。
- 一个标准模块至少关注 `module / controller / service / dto / pipes` 的配套边界。
- `commonModules` 放通用业务能力，`businessModules` 放明确业务域；新增模块前先判断归属。

### DTO / 校验 / 错误处理

- 入参必须使用 class DTO，并结合 `class-validator` / `class-transformer` 完成校验与转换。
- 业务校验优先放 Pipe，领域失败优先使用 `BusinessException` 搭配 `ErrorCode`。
- 成功响应不要手动拼对象，交给 `TransformInterceptor` 统一包装。
- 异常不要直接抛裸字符串或临时错误码，先看 `ErrorCode` 是否可复用，不够再新增。

### Prisma / 数据访问

- 数据库访问统一使用 `PrismaService`。
- 列表查询优先保持“条件构建 + 分页参数 + 并行查询列表和总数”的现有模式。
- 涉及数据库结构变更、迁移、seed 时，必须同步评估影响范围与回滚方式。

### 日志体系

- 业务服务统一注入 `WinstonLoggerService`，日志文案沿用 `[操作] / [验证失败] / [失败]` 前缀模式。
- 已登录用户请求会经 `UserContextInterceptor` 写入 `RequestContext`，日志会自动带用户信息前缀。
- 查询成功、校验失败、异常失败分别使用 `log` / `warn` / `error`，不要混用。

### 共享类型

- 面向前端复用的 DTO / 响应类型放在 `src/types/`，避免前后端各写一份。
- 若某类型只服务后端内部实现，可就近放模块目录，但要避免与共享类型重复定义。

## 反模式

- 不要绕过 DTO 与 Pipe，在 service 里手写零散参数校验。
- 不要手动返回不符合 `{ code, msg, data }` 的响应结构。
- 不要跳过日志记录，尤其是增删改查、认证、导出、上传等关键路径。
- 不要在数据库结构改动时省略 Prisma generate / migration / seed 影响评估。

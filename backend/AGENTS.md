## 后端概述

后端位于 `backend/`，核心栈为 NestJS 11、TypeScript、Prisma 7、SQLite、Winston。

## 进入后端任务前先选 Skill

完整路由见根 `AGENTS.md`；后端常用 skill：`create-backend-module`、`prisma-workflow`、`implement-system-log`。

## 先看哪里

| 任务               | 位置                                                                                                  | 说明                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 应用入口与全局装配 | `src/main.ts` `src/app.module.ts`                                                                     | 全局过滤器、拦截器、模块挂载                 |
| 统一响应结构       | `src/common/interceptors/response.interceptor.ts` `src/types/response.ts`                             | 成功响应统一 `{ code, msg, data }`           |
| 全局异常与业务错误 | `src/common/exceptions/allExceptionsFilter.ts`                                                        | `BusinessException + ErrorCode`              |
| Prisma 接入        | `src/prisma/prisma.service.ts` `src/prisma/prisma.module.ts`                                          | 所有数据库访问统一从这里走                   |
| 日志体系           | `src/common/services/winston-logger.service.ts` `src/common/interceptors/user-context.interceptor.ts` | 自动携带用户上下文                           |
| 业务模块参考       | `src/commonModules/user/*` `src/commonModules/role/*` `src/businessModules/article/*`                 | controller / service / dto / pipe 的现成模板 |

## 非协商约束

- 接口统一使用 `POST`，成功响应由统一拦截器包装成 `{ code, msg, data }`。
- 后端常规开发默认走 `controller / service / dto / pipes` 分层；细则按需加载 `create-backend-module`。
- 数据库访问统一通过 `PrismaService`；结构变更按需加载 `prisma-workflow`。
- 共享契约统一从 `src/types/dto.ts` 与 `src/types/response.ts` 暴露，不要把 Prisma 实体或内部中间结构直接暴露给前端。
- 日志链路、DTO/Pipe 细则、Prisma 顺序等执行性规范，按需加载对应 skill，不在此重复展开。

---
name: create-backend-module
description: 创建或修改 NestJS 模块、controller、service、dto、pipe 时使用，确保符合当前后端分层、响应、校验与日志规则。
---

# 后端模块开发规范

开始前先阅读 `backend/AGENTS.md`，本 skill 只补充模块实现流程与检查点。

## 开发前先查

1. 通用模块参考：`backend/src/commonModules/user/*`
2. 业务模块参考：`backend/src/businessModules/article/*`
3. 统一异常与响应：`backend/src/common/exceptions/allExceptionsFilter.ts`、`backend/src/common/interceptors/response.interceptor.ts`
4. 日志实现：`backend/src/common/services/winston-logger.service.ts`

## 标准模块清单

一个完整模块通常包含：

- `module.ts`
- `controller.ts`
- `service.ts`
- `dto.ts`
- `pipes.ts`（需要业务校验时）

## 核心规范

### 接口与响应

- 接口统一使用 **POST**。
- controller 返回原始业务数据，由全局拦截器统一包装为 `{ code, msg, data }`。
- 不要在 controller 手动拼接成功响应结构。

### DTO / Pipe / 错误处理

- 入参必须使用 class DTO，并配合 `class-validator` / `class-transformer`。
- 业务合法性校验优先放 Pipe，领域失败优先抛 `BusinessException`。
- 错误码优先复用 `ErrorCode`，不够再新增。

### Service / Prisma

- Service 中统一注入 `PrismaService` 与 `WinstonLoggerService`（需要落库 / 日志时）。
- 列表查询优先使用“where 条件 + skip/take + `Promise.all([findMany, count])`”模式。
- 不要把数据库模型原封不动透传给前端，优先整理为稳定响应字段。

### 模块归属

- 与具体业务域强相关的放 `businessModules/`。
- 跨业务复用、偏平台能力的放 `commonModules/`。

## 反模式

- 不要直接抛字符串、随意返回裸对象或非统一错误码。
- 不要跳过 DTO / Pipe，把参数校验散落在 controller / service。
- 不要新增与现有模块命名、分层风格冲突的新目录结构。

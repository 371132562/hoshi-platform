---
name: create-backend-module
description: 创建或修改 NestJS 模块、controller、service、dto、pipe 时使用，确保符合当前后端分层、响应、校验与日志规则。
---

# 后端模块开发规范

## 先查

- `backend/src/commonModules/user/*`
- `backend/src/commonModules/role/*`
- `backend/src/businessModules/article/*`

## 执行检查单

1. 标准模块结构优先保持 `module / controller / service / dto / pipes`。
2. 请求命名统一 `ReqDto`，响应命名统一 `ResDto`。
3. 参数结构合法性放 DTO，业务前置校验放 `*.pipes.ts`。
4. controller 只返回原始业务数据，不手动拼 `{ code, msg, data }`。
5. 需要前端复用的契约同步导出到 `backend/src/types/dto.ts` / `response.ts`。
6. 业务失败统一走 `BusinessException + ErrorCode`。
7. service 里不要直接透传 Prisma model，先整理成稳定响应字段。
8. 入参 DTO 负责字段形状、基础转换、字段级校验；唯一性、存在性、权限状态流转不要写进 DTO。
9. 数值分页、数字筛选等字段沿用 `@Type(() => Number)` 与全局 `ValidationPipe` 的转换能力。
10. 更新类 DTO 保持“`id` 必填 + 其余字段手动可选”的项目风格，不要默认改成 `PartialType`。
11. 列表查询优先复用“where 条件 + skip/take + `Promise.all([findMany, count])`”模式。
12. 模块归属先判断：平台共用能力放 `commonModules`，明确业务域放 `businessModules`。

## 反模式

- 不要把参数校验散落在 controller / service。
- 不要把 Prisma 实体或内部中间结构直接当成共享 DTO。
- 不要让前端深层 import 后端模块内部 `*.dto.ts`。
- 不要直接抛字符串或临时错误码。

---
name: create-backend-module
description: 当用户要创建或修改 NestJS 模块、controller、service、dto、pipe 或后端业务链路时使用；重点约束当前后端分层、统一响应、校验方式、错误处理与日志规则。
---

# 后端模块开发规范

## 先查

- `backend/src/commonModules/user/*`
- `backend/src/commonModules/role/*`
- `backend/src/businessModules/article/*`

## 执行检查单

1. 标准模块结构优先保持 `module / controller / service / dto / pipes`。
2. 类型契约细则转 `type-contract-guidelines`。
3. 参数结构合法性放 DTO，业务前置校验放 `*.pipes.ts`。
4. controller 只返回原始业务数据，不手动拼 `{ code, msg, data }`。
5. 业务失败统一走 `BusinessException + ErrorCode`。
6. service 返回稳定业务字段，不把数据库查询结果原样抛给上层。
7. 列表查询优先复用“where 条件 + skip/take + `Promise.all([findMany, count])`”模式。
8. 模块归属先判断：平台共用能力放 `commonModules`，明确业务域放 `businessModules`。

## 反模式

- 不要把参数校验散落在 controller / service。
- 不要直接抛字符串或临时错误码。

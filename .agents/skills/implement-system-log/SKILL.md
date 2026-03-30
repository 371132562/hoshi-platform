---
name: implement-system-log
description: 实现或修改系统日志、用户日志、关键操作日志时使用，遵循当前 Winston + RequestContext 的日志链路。
---

# 系统日志规范

开始前先阅读 `backend/AGENTS.md`，本 skill 只补充日志链路设计、记录时机与前后端配合方式。

## 参考实现

- `backend/src/common/services/winston-logger.service.ts`
- `backend/src/common/interceptors/user-context.interceptor.ts`
- `backend/src/commonModules/systemLogs/systemLogs.service.ts`
- `frontend/src/pages/System/SystemMaintenance/components/LogPanel.tsx`

## 日志写法

1. 统一通过 `WinstonLoggerService` 输出日志。
2. 文案前缀沿用当前约定：
   - 成功流程：`[操作] ...`
   - 校验失败：`[验证失败] ...`
   - 异常失败：`[失败] ...`
3. 已登录用户请求会自动带上用户上下文前缀，不要手动重复拼用户标识。

## 记录时机

1. 查询开始与查询成功可记录 `log`。
2. 业务前置校验失败记录 `warn`。
3. catch 中记录 `error`，并附带 `stack`。
4. 新增、编辑、删除、上传、认证、导出、日志读取等关键动作要有完整链路。

## 前后端配合

- 后端负责真正的日志落盘与用户上下文拼接。
- 前端日志查询页面优先复用 `systemLogsStore` 与 `LogPanel` 的筛选交互模式。

## 反模式

- 不要使用 `console.log` 代替正式日志。
- 不要把成功、校验失败、异常失败混成同一级别。
- 不要在关键写操作完成后遗漏成功日志。

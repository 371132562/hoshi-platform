---
name: implement-system-log
description: 实现或修改系统日志、用户日志、关键操作日志时使用，遵循当前 Winston + RequestContext 的日志链路。
---

# 系统日志规范

## 参考实现

- `backend/src/common/services/winston-logger.service.ts`
- `backend/src/common/interceptors/user-context.interceptor.ts`
- `backend/src/commonModules/systemLogs/systemLogs.service.ts`

## 执行检查单

1. 统一使用 `WinstonLoggerService`。
2. 文案前缀保持 `[操作] / [验证失败] / [失败]`。
3. 查询成功用 `log`，校验失败用 `warn`，异常失败用 `error`。
4. 增删改查、认证、导出、上传、日志读取等关键动作补齐日志链路。
5. 已登录请求依赖 `RequestContext` 自动带用户上下文，不要手动重复拼用户标识。
6. catch 中记录 `stack`；前端日志查询页优先复用 `systemLogsStore` 与 `LogPanel` 交互模式。

## 反模式

- 不要用 `console.log` 代替正式日志。
- 不要混用日志级别。
- 不要遗漏关键写操作的成功日志。

---
name: type-contract-guidelines
description: 创建或修改 DTO、共享 type、backend/src/types 导出与前后端类型契约时使用，统一目录结构、命名和共享边界。
---

# 类型契约规范

## 何时用

- 创建或修改模块内 `*.dto.ts`
- 调整 `backend/src/types/dto.ts` / `response.ts` 的共享导出
- 调整前后端共享 DTO / response / 枚举
- 判断某个类型应放模块内、共享出口，还是前端本地视图层

## 目录结构风格

### 后端模块内类型

- 每个业务模块优先在自己的 `*.dto.ts` 中维护该模块的请求 DTO、响应 type、局部枚举、轻量复用 type。
- 常见位置：
  - `backend/src/commonModules/*/*.dto.ts`
  - `backend/src/businessModules/*/*.dto.ts`
- 模块内优先放：
  - `CreateXxxReqDto` / `UpdateXxxReqDto` / `DeleteXxxReqDto`
  - `XxxItemResDto` / `XxxListResDto` / `XxxResDto`
  - 仅该模块使用的枚举与组合 type

### 后端共享出口

- 跨前后端复用的稳定契约统一从以下出口暴露：
  - `backend/src/types/dto.ts`
  - `backend/src/types/response.ts`
- `backend/src/types/dto.ts` 负责 re-export 前端真正需要消费的 DTO / type。
- `backend/src/types/response.ts` 负责 `ErrorCode`、`ResponseBody` 等统一响应协议。
- 不要把仅后端内部使用的中间 type、Prisma 实体、JWT payload 等默认暴露到共享出口。

### 前端本地类型

- 前端共享契约统一从 `template-backend/src/types/dto` 与 `template-backend/src/types/response` 导入。
- 仅当前端专用的视图层结构放在前端本地，例如：
  - `frontend/src/types/index.ts`
  - 页面内临时表单态 / 拖拽态 / 树节点适配 type
- 前端本地 type 负责“UI 适配”，不要复制后端已稳定导出的业务字段。

## 命名规则

1. 入参统一 `ReqDto` 结尾。
2. 出参统一 `ResDto` 结尾。
3. 请求优先使用 class；响应优先使用 type。
4. 通用分页请求 / 响应也遵循同一规则，如 `CommonPageReqDto`、`PaginatedResDto<T>`。

## 放置判断

1. 只在单模块内使用 → 放模块 `*.dto.ts`
2. 前后端都要消费 → 模块内定义后，再导出到 `backend/src/types/dto.ts`
3. 只在前端渲染层使用 → 放前端 `src/types/` 或页面附近
4. 只服务后端内部实现 → 留在模块内，不导出到共享层

## 执行检查单

1. 先判断这是模块内类型、共享契约，还是前端视图 type。
2. 新增共享契约时，先在模块 `*.dto.ts` 定义，再评估是否导出到 `backend/src/types/dto.ts`。
3. 修改共享契约后，同步检查前端导入点与 store / page / component 消费。
4. 请求 DTO 负责字段形状、基础转换、字段级校验；业务合法性仍交给 `*.pipes.ts` 或 service。
5. 不要让前端深层 import 后端模块 `*.dto.ts`。

## 反模式

- 不要把 Prisma model 直接当共享 DTO。
- 不要把仅后端内部 type 暴露到 `backend/src/types/dto.ts`。
- 不要在前端重复声明后端已导出的业务字段。
- 不要把 DTO 目录结构拆成与现有模块风格冲突的新体系。

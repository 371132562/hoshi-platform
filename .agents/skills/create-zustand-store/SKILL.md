---
name: create-zustand-store
description: 创建或修改 Zustand Store 时使用，约束状态命名、异步 action、请求封装和组件订阅方式。
---

# Zustand Store 规范

开始前先阅读 `frontend/AGENTS.md`，本 skill 只补充 Store 设计与异步 action 规则。

## 参考实现

- `frontend/src/stores/authStore.ts`
- `frontend/src/stores/userStore.ts`
- `frontend/src/stores/articleStore.ts`

## 状态设计原则

1. 每个 store 文件默认导出一个 `useXxxStore`。
2. Store 状态按业务模块拆分，不导出零散 state / action。
3. 查询参数优先收敛为 `xxxPageParams` 这类统一对象，便于分页、筛选和恢复状态。

## 异步 Action 规范

1. 统一使用 `try / catch / finally` 管理 loading。
2. 提交类操作成功后刷新列表、详情或相关派生数据。
3. 调用请求统一走 `services/base.ts`，接口地址来自 `services/apis.ts`。
4. 需要返回结果时，优先返回 `Promise<boolean>` 或带 `success` 字段的对象，避免返回形态漂移。

## 组件使用规范

1. 组件内按 selector 读取：`useXxxStore(state => state.xxx)`。
2. 组件外使用 `useXxxStore.getState()`。
3. 不要在视图层重命名核心 state / action，保持含义稳定。

## 类型规范

1. 业务 DTO / 响应类型优先复用后端共享类型。
2. 仅表单临时态、筛选态等前端专用结构，才就近定义。
3. 禁止使用 `any` 掩盖状态结构不清的问题。

## 反模式

- 不要在页面里复制一套和 store 相同的 loading / list / pagination 状态。
- 不要跳过 store 直接在多个组件里重复写同一组请求逻辑。
- 不要一次性订阅整个 store 导致无效渲染。

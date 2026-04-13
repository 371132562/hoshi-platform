---
name: create-zustand-store
description: 当用户要创建、拆分或修改 Zustand Store、页面级状态、列表查询状态或异步 Action 时使用；重点约束状态命名、请求封装、刷新闭环与组件订阅方式。
---

# Zustand Store 规范

## 参考实现

- `frontend/src/stores/authStore.ts`
- `frontend/src/stores/userStore.ts`
- `frontend/src/stores/articleStore.ts`

## 执行检查单

1. 每个文件默认导出一个 `useXxxStore`。
2. 查询参数优先收敛为 `xxxPageParams`。
3. 异步 action 统一用 `try / catch / finally` 管理 loading。
4. 提交成功后刷新列表、详情或相关派生数据。
5. 请求统一走 `services/base.ts` + `services/apis.ts`。
6. 组件内按 selector 订阅，组件外使用 `getState()`。
7. 需要向视图层返回结果时，优先返回 `Promise<boolean>` 或稳定对象，不要每个 action 各自漂移。
8. 类型契约细则转 `type-contract-guidelines`。
9. 核心 state / action 命名保持稳定，不要在组件层重新发明一套术语。

## 反模式

- 不要在页面里复制同一套 loading / list / pagination 状态。
- 不要跳过 store 在多个组件里重复写请求逻辑。
- 不要一次性订阅整个 store。

---
name: create-frontend-component
description: 创建或修改 React 页面、组件、布局、样式、路由承载页面时使用，保证遵循当前前端分层与 UI 风格。
---

# 前端组件与页面开发规范

若任务强依赖 Ant Design 官方 API 或示例，继续加载 `ant-design-docs`。

## 先查

- `frontend/src/pages/System/UserManagement/index.tsx`
- `frontend/src/pages/ArticleManagement/index.tsx`
- `frontend/src/components/Layout/AdminLayout.tsx`
- `frontend/src/pages/System/SystemMaintenance/components/LogPanel.tsx`

## 执行检查单

1. 页面/组件只负责展示与交互编排。
2. 请求走 `services/apis.ts` + `services/base.ts`。
3. 业务状态放 `stores/`，不要回流进页面组件。
4. 样式优先级保持 `Ant Design > Tailwind CSS > CSS Modules`。
5. 列表页优先复用“筛选区 + 主按钮 + 表格主体”密度。
6. 修改页面入口时同步检查 `router/` 的菜单、面包屑与权限字段。
7. 共享 DTO / response 优先复用后端共享出口。
8. 后台路由相关字段同步检查 `adminOnly`、`menuParent`、`hideInBreadcrumb`。
9. 复杂页面优先拆页面内子组件或公共组件，不要把大段 JSX 分支堆进单文件。
10. 加载态优先骨架屏或现有 Loading 组件，文案统一中文。

## 反模式

- 不要在组件里直接写 URL、`fetch`、成功码判断。
- 不要把大段业务逻辑堆进 `useEffect`。
- 不要重复声明后端已导出的业务字段。

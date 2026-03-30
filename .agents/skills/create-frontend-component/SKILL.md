---
name: create-frontend-component
description: 创建或修改 React 页面、组件、布局、样式、路由承载页面时使用，保证遵循当前前端分层与 UI 风格。
---

# 前端组件与页面开发规范

开始前先阅读 `frontend/AGENTS.md`，本 skill 只补充前端页面与 UI 交付流程，不重复根规则。

若任务强依赖 Ant Design 官方组件 API、示例或组合模式，继续加载 `ant-design-docs` skill。

## 开发前先查

1. 页面参考：`frontend/src/pages/System/UserManagement/index.tsx`
2. 列表/筛选/表格参考：`frontend/src/pages/ArticleManagement/index.tsx`
3. 布局参考：`frontend/src/components/Layout/AdminLayout.tsx`
4. 日志/复杂筛选参考：`frontend/src/pages/System/SystemMaintenance/components/LogPanel.tsx`

## 核心规范

### 分层边界

- `pages/` 与 `components/` 只负责展示与交互组织。
- 请求地址放 `services/apis.ts`，请求实现走 `services/base.ts`。
- 业务状态与异步 action 放 `stores/`，不要把数据流塞回页面组件。

### UI 与样式

- 样式优先级：**Ant Design > Tailwind CSS > CSS Modules**。
- 管理后台风格保持克制、清晰、可扫读；避免花哨配色和多余装饰。
- 列表页优先沿用“筛选区 + 主操作按钮 + 表格主体”的现有密度。
- 加载状态优先骨架屏或现有 Loading 组件。

### 类型与路由

- DTO / 响应优先复用 `template-backend/src/types/dto` 与 `template-backend/src/types/response`。
- 修改页面入口时同步检查 `router/` 中的路由、菜单、面包屑与权限字段。
- 新增后台菜单时要评估 `adminOnly`、`menuParent`、`hideInBreadcrumb`。

### 注释与命名

- 组件使用 PascalCase，变量 / 函数使用 camelCase。
- 为复杂交互、权限分支、异常兜底补充中文注释，解释业务意图。

## 反模式

- 不要在组件里直接写 URL、`fetch`、成功码判断。
- 不要为了方便把大量业务逻辑堆在 `useEffect`。
- 不要重复声明后端已经导出的业务类型。

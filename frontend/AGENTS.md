## 前端概述

前端位于 `frontend/`，核心栈为 React 18、TypeScript、Zustand、Ant Design 6、Tailwind CSS 4、React Router 7。

## 进入前端任务前先选 Skill

- 跨前后端或需求尚未收敛：先走 `/.agents/skills/project-workflow/SKILL.md`
- 页面、组件、布局、样式、路由承载页：先走 `/.agents/skills/create-frontend-component/SKILL.md`
- Zustand Store、分页筛选状态、异步 action：先走 `/.agents/skills/create-zustand-store/SKILL.md`
- 涉及 Ant Design 组件 API、示例、交互组合或官方文档查阅：补充走 `/.agents/skills/ant-design-docs/SKILL.md`

## 先看哪里

| 任务                   | 位置                                                                                     | 说明                             |
| ---------------------- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| 页面入口与权限路由     | `src/router/adminRoutes.tsx` `src/router/publicRoutes.tsx` `src/router/routesConfig.tsx` | 路由、菜单、面包屑都从这里出发   |
| 请求常量与统一请求封装 | `src/services/apis.ts` `src/services/base.ts`                                            | 不要跳过这层直接 `fetch`         |
| 认证与用户状态         | `src/stores/authStore.ts`                                                                | 持久化、登录、用户信息同步       |
| 列表页/表单页参考      | `src/pages/System/UserManagement/index.tsx` `src/pages/ArticleManagement/index.tsx`      | 先参考既有页面模式               |
| 日志页参考             | `src/pages/System/SystemMaintenance/components/LogPanel.tsx`                             | 查询、筛选、骨架态、表格样式参考 |

## 目录职责

```text
src/
├── pages/         # 页面容器，负责页面级布局与交互编排
├── components/    # 公共组件与布局组件
├── stores/        # Zustand 业务状态与异步 action
├── services/      # API 常量与 fetch 封装
├── router/        # 路由定义、菜单、面包屑、权限辅助
├── types/         # 前端视图专用类型
└── utils/         # 纯工具函数与少量轻量渲染辅助
```

## 核心约定

### 组件 / 页面

- 组件与页面文案统一中文，设计风格保持管理后台的克制、清晰、易扫读。
- 新页面先复用既有布局密度：顶部筛选区 + 右侧主按钮 + 表格 / 卡片主体。
- 样式优先级：**Ant Design > Tailwind CSS > CSS Modules**。
- 复杂交互优先拆成页面内部组件或公共组件，不要在一个页面文件里堆过长 JSX 分支。

### 路由 / 权限

- 路由配置统一放在 `router/`，不要在页面内部临时定义权限规则。
- 后台菜单权限依赖 `routesConfig.tsx` 与角色 `allowedRoutes`，修改菜单时要同步考虑面包屑与菜单父子关系。
- `adminOnly`、`menuParent`、`hideInBreadcrumb` 等字段是现有路由体系的一部分，新增路由时要完整评估。

### Store / 请求

- 每个 store 默认导出一个 `useXxxStore`，不要解构导出 state / action。
- 组件内按 selector 读取 store，避免整仓订阅。
- 异步 action 统一管理 loading，并在成功后刷新列表、详情或相关派生数据。
- 所有请求走 `src/services/base.ts`；接口地址统一收敛到 `src/services/apis.ts`。
- 成功判断遵循后端统一结构 `{ code, msg, data }`，成功码为 `ErrorCode.SUCCESS`。

### 类型与共享模型

- 业务 DTO、响应类型优先复用 `template-backend/src/types/dto` 与 `template-backend/src/types/response`。
- 仅当前端视图层临时表单态、筛选态，才在页面或 store 附近定义本地类型。
- 不要在前端重复声明后端已经导出的实体字段。

## 反模式

- 不要直接在组件里散落 `fetch`、URL 字符串和业务成功判断。
- 不要为了省事订阅整个 store 或把大型业务逻辑塞进 `useEffect`。
- 不要用 emoji 充当正式业务图标。
- 不要新增与现有管理后台视觉密度明显冲突的卡片、色彩和间距体系。

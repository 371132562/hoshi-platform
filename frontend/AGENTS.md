## 前端概述

前端位于 `frontend/`，核心栈为 React 18、TypeScript、Zustand、Ant Design 6、Tailwind CSS 4、React Router 7。

## 进入前端任务前先选 Skill

完整路由见根 `AGENTS.md`；前端常用 skill：`create-frontend-component`、`create-zustand-store`、`ant-design-docs`、`type-contract-guidelines`、`comment-detail-preservation`。

如果当前环境是 WSL、项目位于 `/mnt/<盘符>/...`，且要执行 `pnpm` / `vite` / `eslint` / `tsc` / `build` 等依赖相关命令，先参考根 `AGENTS.md` 中强制 skill `/wsl-windows-command-bridge`。

## 先看哪里

| 任务                   | 位置                                                                                     | 说明                             |
| ---------------------- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| 页面入口与权限路由     | `src/router/adminRoutes.tsx` `src/router/publicRoutes.tsx` `src/router/routesConfig.tsx` | 路由、菜单、面包屑都从这里出发   |
| 请求常量与统一请求封装 | `src/services/apis.ts` `src/services/base.ts`                                            | 不要跳过这层直接 `fetch`         |
| 认证与用户状态         | `src/stores/authStore.ts`                                                                | 持久化、登录、用户信息同步       |
| 列表页/表单页参考      | `src/pages/System/UserManagement/index.tsx` `src/pages/ArticleManagement/index.tsx`      | 先参考既有页面模式               |
| 日志页参考             | `src/pages/System/SystemMaintenance/components/LogPanel.tsx`                             | 查询、筛选、骨架态、表格样式参考 |

## 非协商约束

- 请求统一走 `src/services/base.ts`，接口地址统一收敛到 `src/services/apis.ts`。
- 共享类型契约细则转 `type-contract-guidelines`。
- 路由、菜单、面包屑相关改动统一落在 `router/`。
- 常规列表页（顶部工具栏含搜索、新建等操作）的 `Table` 默认参考 `UserManagement` / `ArticleManagement` / `RoleManagement`：使用 `scroll={{ x: 'max-content', y: 'calc(100vh - 360px)' }}`，纯分页场景优先用 `pagination.onChange`。
- 只要本次开发会新增或修订注释，先参考根 `AGENTS.md` 中强制 skill `/comment-detail-preservation`；对高约束前端逻辑默认保留或写出与风险匹配的详细程度，不要事后再补。
- 页面与组件、Store、共享类型契约、Ant Design 文档消费方式，按需加载对应 skill，不在此重复展开。

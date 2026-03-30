## 项目概述

Hoshi Platform 是一个 `pnpm` monorepo 管理平台模板，前端采用 React 18 + TypeScript + Zustand + Ant Design + Tailwind CSS，后端采用 NestJS + TypeScript + Prisma + SQLite。

- 所有输出、注释、交互文案统一使用**中文**。
- 本仓库采用“根 AGENTS + 子目录 AGENTS + `.agents/skills/*/SKILL.md`”的分层方式组织 Agent 规范。
- 临时文件、草稿、日志等中间产物放在 `.agent/`，**不要**放进 `.agents/`。

## 先看哪里

| 任务类型                           | 先读文件                                     |
| ---------------------------------- | -------------------------------------------- |
| 整体约定、任务路由、何时调用 Skill | `./AGENTS.md`                                |
| 前端页面、组件、路由、Store、请求  | `./frontend/AGENTS.md`                       |
| 后端模块、DTO、Prisma、响应、日志  | `./backend/AGENTS.md`                        |
| 需求分析、规划、验收流程           | `./.agents/skills/project-workflow/SKILL.md` |

## 强制使用的 Skills

以下场景**必须**先调用对应 Skill，再进入实现：

| 场景                                                        | 必须调用的 Skill             |
| ----------------------------------------------------------- | ---------------------------- |
| 新功能开发、跨模块改动、需要先做验收契约与 TODO 拆解        | `/project-workflow`          |
| 创建/修改 React 页面、布局、组件、样式、路由承载页面        | `/create-frontend-component` |
| 创建/修改 Zustand Store、列表查询状态、异步 Action          | `/create-zustand-store`      |
| 创建/修改 NestJS controller / service / dto / pipe / module | `/create-backend-module`     |
| 修改 Prisma schema、seed、生成客户端、涉及数据库落库逻辑    | `/prisma-workflow`           |
| 新增或调整系统日志、用户日志、操作日志链路                  | `/implement-system-log`      |
| 运行或修复 ESLint / TypeScript 检查                         | `/eslint-fix`                |

## 目录路由

```text
hoshi-platform/
├── frontend/                 # 前端应用，细则见 frontend/AGENTS.md
├── backend/                  # 后端服务，细则见 backend/AGENTS.md
├── .agent/                   # 临时产物目录（中间文件、草稿、日志）
├── .agents/skills/           # 项目级 Skills
├── AGENTS.md                 # 根规范与路由入口
└── pnpm-workspace.yaml       # workspace 定义
```

## 全局原则

### 第一性原则

- 不要把用户的表述机械翻译成代码动作，要先回到业务目标、输入输出和风险边界。
- 不要为了“兼容旧逻辑”叠补丁式分支；优先收敛为单一可信实现。
- 不要过度抽象；相同模式未稳定出现三次前，优先复用现有实现。

### 通用开发要求

- 开发前至少查找 **3 个项目内相似实现**，优先沿用现有命名、分层、错误处理与注释风格。
- 注释必须帮助后续维护者理解“为什么这样做”，不要只翻译代码表面行为。
- 非用户明确要求时，不自动提交代码，不新增无必要文档。
- 破坏性变更必须先确认：删除核心配置、修改数据库结构、大范围重构、不可逆 git 操作。

### 文档与目录边界

- `AGENTS.md` 负责**长期稳定的项目规则**。
- `.agents/skills/*/SKILL.md` 负责**可重复执行的任务规范**。
- 子目录 `AGENTS.md` 只写该目录独有的规则，**不要重复根规则全文**。

## 禁止操作

- 禁止跳过 `services/base.ts` 或后端统一响应约定，直接自造请求/响应协议。
- 禁止用 `any` 作为常规开发逃生口；需要共享类型时优先复用 `backend/src/types/*`。
- 禁止因为检查报错就删除注释、关闭校验、绕开 DTO / Pipe / BusinessException。
- 禁止把技能规范、项目知识库、临时文件混放到同一个目录。

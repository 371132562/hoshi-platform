## 项目说明

- 您作为中文母语的全栈工程师、高级 UI 设计师和高级产品经理，负责本项目的前后端开发、功能设计以及 UI 设计。
- 本项目为管理平台模版项目，前端采用 React + TypeScript + Zustand + Ant Design，后端采用 NestJS + TypeScript + Prisma + SQLite。
- 所有回答应使用中文。
- 本仓库是 monorepo 项目，包含 `frontend` 和 `backend` 两个子项目，依赖管理统一使用 `pnpm`，部分通用依赖安装在根目录的 package 中以避免重复安装。

## Agent 工作规范

### 目录与临时文件

- 所有由 Agent 在本项目工作过程中产生的临时文件（中间产物、缓存、日志、草稿等）必须创建在项目根目录的 `.agent` 目录下，不得在其他目录散落生成临时文件，除非用户明确要求。
- 建议为每个任务使用独立子目录（例如 `.agent/<date>-<task-name>/`）归档该任务的记录和中间文件，便于追踪与清理。
- 若需要记录关键决策、问题与尝试路径，统一写入 `.agent/operations-log.md` 或对应任务子目录下的日志文件。

### 工作流程（4 阶段）

#### 阶段 0：需求理解与上下文收集

- 在开始任何开发或修改前，先对仓库进行结构化快速扫描：确认本次任务涉及的子项目、关键目录、主要技术栈以及现有测试/脚本入口（如 `pnpm` 命令）。
- 与用户确认本次任务的业务目标和边界：包括接口契约（输入/输出、错误码）、数据流向、性能或安全要求等；对不明确部分必须用清单形式向用户提问澄清。
- 检查现有文档、代码注释和类似功能实现，记录当前实现现状与潜在风险点（例如：业务规则不一致、缺少测试、数据库变更风险等）。

#### 阶段 1：任务规划

- 深度思考（sequential-thinking）
- 基于阶段 0 的信息，先输出本次任务的验收契约：
  - 预期输入与输出（包括边界与异常场景）。
  - 覆盖的模块/接口/页面列表。
  - 需要通过的测试或验证方式（如具体测试文件、`pnpm` 命令、手动验证步骤）。
- 列出详细的 plan 和 TODO 项，以“可执行小步骤”为单位，至少包含：要修改的文件/模块、预期改动点、是否新增/修改测试以及可能的回滚方案。
- 如涉及新增函数/类/接口，必要时先在规划中给出大致签名、数据结构与错误处理策略，再征求用户确认。
- 将上述 plan/TODO 明确展示给用户，等待用户审核确认后再进入代码改动阶段；如用户未确认或提出异议，需要先完成对齐再继续。

#### 阶段 2：代码执行

- 按照 plan 小步迭代实现，每次改动保持项目处于可编译、可通过类型检查的状态；尽量只修改与任务强相关的模块和文件，避免一次性跨多个无关模块；涉及的逻辑应同步补充或调整测试用例，而不是仅修改实现。
- 严格遵循项目既有的编码规范与风格：包括文件组织方式、命名约定、导入顺序、错误处理模式以及前后端的分层边界，不自创与现有风格冲突的模式。
- 优先复用项目中已有的工具函数、组件、Hook、服务和通用模块，避免为一处需求自研重复能力或引入炫技写法。
- 在未得到用户明确要求的情况下，Agent 过程中不进行 git 提交、不执行长时间 dev 运行、不做 build 构建或破坏性数据库迁移；涉及删除核心配置、修改数据库结构或大范围重构前，必须先征求用户确认。

#### 阶段 3：结果验证与交付

- 根据阶段 1 约定的验收契约逐项自查：确保相关接口/页面按预期工作，类型检查、ESLint 检查与关键测试用例通过，没有未处理的错误日志或明显告警。
- 在最终回复中用结构化方式列出：本次改动影响的文件/模块列表、主要变更点、新增/修改的测试及其验证结论，以及后续建议或已知限制。
- 清理不再需要的临时文件与实验性代码片段，保证工作结果可直接被接手和继续迭代。

### 开发哲学

- 渐进式迭代，小步快跑，保持每次改动可编译、可验证，优先让小范围变更尽早通过类型检查和测试再继续扩展。
- 实现前先研读现有代码与文档，优先复用官方或主流生态方案以及项目中已有的通用模块，避免不必要的自研与炫技式实现。
- 简单优先：坚持单一责任原则，相同或相似逻辑至少出现三次再考虑抽象，避免过早设计复杂框架或通用层。
- 严格遵循既有风格与约定（导入顺序、命名方式、格式化规则、构建与测试框架）。
- 开发前需主动查找至少 3 个项目内相似特性或组件，学习并沿用其复用方式与测试编排模式，保证一致的用户体验与工程实践。
- 对于冗余与过时实现，在确认不再需要后应及时删除，而不是长期保留多个分支逻辑；需要破坏性变更时，通过阶段 0/1 提前向用户说明影响范围并取得确认。 
- 核心业务逻辑与易踩坑部分必须配简洁明了的中文功能解释注释，避免后续维护者只能从实现细节反推意图。
- 当需要提交代码时，git commit 信息应以 `feat`、`dix`、`chore` 等前缀开头，并用简体中文描述具体改动内容。

## 类型系统规范

- 禁止使用 `any`。
- 接口入参必须使用 class DTO，结合 `class-validator` 与 `class-transformer` 进行校验与转换。
- 响应数据允许使用 type，若使用 class 作为响应 DTO，字段装饰器需完整，并包含默认值/可选性说明。
- 前端消费侧统一使用后端 `InstanceType<typeof ExampleDto>` 导出的 type，避免引入装饰器与运行时依赖。
- 前后端共享类型放在 `backend/types` 目录下供前后端共用（以 type 为主，仅作工具/辅助）。

## 前端开发规范

- 组件命名采用 PascalCase。
- Props 必须明确定义 TypeScript 类型。
- `useEffect` 必须明确声明依赖项。
- 公共逻辑提取为自定义 Hook 或 HOC。
- 变量/函数使用 `camelCase`，类/接口用 PascalCase，常量用 `UPPER_SNAKE_CASE`。
- 前端应分为视图层（UI 组件）、数据逻辑层/状态管理层（Zustand store 文件）、API 端点（API 地址文件），各司其职，遵循单一职责原则。
- 前后端文件命名优先采用各自既有约定规则；在无明确约定时，文件名统一使用驼峰命名法 `camelCase`。

## 前端样式规范

- 样式方案优先级：Ant Design > Tailwind CSS > CSS Modules。
- Avoid using global styles and keep the global visual style consistent.
- Prefer skeleton screens for loading states.

### Core Design Principles

- The goal of the site is to look sleek, premium, and minimalist, like a spa in Switzerland.
- Design this in a way that matches what a working professional would reasonably pay thousands of dollars a month for, in a way that would make Steve Jobs smile.

### Visual and Interaction Guidelines

- Iconography: Use icons instead of emojis.
- Color Palette: Avoid using colors unnecessarily; instead, pick from a cohesive palette and stick to it.
- Spacing and Padding Guidelines: Fix the padding so every component is spaced perfectly—not too close to other components but not too dispersed to waste space.

### Responsiveness

- Ensure the site is responsive and elegant on both desktop and mobile.

## 后端开发规范

- 遵循 NestJS 最佳实践。
- 接口必须统一使用 POST 方法。
- 使用 Prisma 处理数据库操作。
- 业务错误需返回合适的错误信息，优先使用自定义的 `BusinessException` 搭配 `ErrorCode`，当前错误类型不满足时在 `ErrorCode` 中新增。
- 接口入参使用 class DTO 验证类型的合法性，使用 Pipe 验证业务上的合法性。
- 简单的、通用的业务逻辑可以抽取为 Pipe 以便于复用。
- `businessModules` 是业务模块，`commonModules` 是通用模块，`common` 中是通用组件。

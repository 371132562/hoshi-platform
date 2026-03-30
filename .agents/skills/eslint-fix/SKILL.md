---
name: eslint-fix
description: 在本项目运行或修复 ESLint、TypeScript 相关问题时使用，按 monorepo 子项目粒度执行检查，避免无关全量开销。
---

# ESLint / TypeScript 检查规范

## 执行原则

1. 优先按修改范围执行，不要无差别全仓扫一遍。
2. 前端改动优先检查 `frontend/`，后端改动优先检查 `backend/`。
3. 文档、纯文案、纯知识库改动，可只做对应文件诊断，不必强行全量 lint。
4. 本 skill 负责 lint / typecheck 优先级的检查，不默认触发 `install / dev / build`；如确需构建验证，应先确认这一步与当前任务直接相关。

## 常用命令

```bash
pnpm --dir frontend lint
pnpm --dir backend lint
pnpm exec eslint AGENTS.md frontend/AGENTS.md backend/AGENTS.md .agents/skills/**/*.md
```

如需类型或构建确认，再按范围追加：

```bash
pnpm --dir frontend build
pnpm --dir backend build
```

## 修复顺序

1. 先修 import 排序、未使用变量、明显语法错误。
2. 再修真实类型问题与逻辑问题。
3. 自动修复后必须复跑一次，确认没有引入新问题。

## 反模式

- 不要因为赶时间就关闭规则、删除注释或用 `any` 草草通过检查。
- 不要忽略 monorepo 子项目边界，在错误目录执行无效命令。

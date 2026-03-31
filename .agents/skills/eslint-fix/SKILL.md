---
name: eslint-fix
description: 在本项目运行或修复 ESLint、TypeScript 相关问题时使用，按 monorepo 子项目粒度执行检查，避免无关全量开销。
---

# ESLint / TypeScript 检查规范

## 执行检查单

1. 按修改范围跑检查，优先前后端分开执行。
2. 文档 / 知识库改动可只做对应文件诊断。
3. 先修 import、未使用变量、语法错误，再修真实类型问题。
4. 自动修复后复跑一次。
5. 本 skill 不默认触发 `install / dev / build`；如确需构建验证，必须与当前任务直接相关。

## 常用命令

```bash
pnpm --dir frontend lint
pnpm --dir backend lint
pnpm exec eslint AGENTS.md frontend/AGENTS.md backend/AGENTS.md .agents/skills/**/*.md
```

## 反模式

- 不要因为赶时间就关闭规则、删除注释或用 `any` 混过去。
- 不要忽略 monorepo 边界，在错误目录执行无效命令。

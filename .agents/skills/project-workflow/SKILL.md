---
name: project-workflow
description: 在本项目执行中大型任务时使用，负责需求理解、验收契约、TODO 拆解、实现边界与结果验证。
---

# 项目开发工作流

## 何时用

- 新功能、跨前后端联动、范围不清的任务
- 需要先做验收契约、TODO 拆解、验证计划

## 最小输出

1. 任务目标、输入输出、边界情况
2. 受影响文件 / 模块 / 页面 / 接口
3. TODO 拆解与回滚点
4. 验证方案（LSP / lint / typecheck / 测试）
5. 风险点与是否需要后续转入领域 skill

## 执行检查单

1. 至少找 3 个项目内相似实现。
2. 先定验收，再动代码。
3. 拆成小步修改，保持每步都可验证。
4. 规划完成后转入对应领域 skill：前端走 `create-frontend-component` / `create-zustand-store`，后端走 `create-backend-module` / `prisma-workflow` / `implement-system-log`。
5. 验证默认优先级：LSP → lint / typecheck → 测试；`install / dev / build / preview / start` 不是默认步骤。

## 反模式

- 不要跳过验收契约直接开改。
- 不要在没有相似实现时自造新模式。
- 不要默认执行 `install / dev / build / preview / start`。

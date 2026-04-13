---
name: project-workflow
description: 当需求不清晰、改动较大、需要先梳理验收契约与 TODO，或用户明确要求先给方案时使用；按需求理解、执行规划、代码落地与结果验证推进任务。
---

# 项目开发工作流

## 何时用

- 新功能、跨前后端联动、范围不清的任务
- 需要先做验收契约、TODO 拆解、验证计划
- 会影响多个页面、Store、接口、数据库结构或共享类型的任务

## 最小输出

1. 任务目标、输入输出、边界情况
2. 受影响文件 / 模块 / 页面 / 接口
3. TODO 拆解与回滚点
4. 验证方案（LSP / lint / typecheck / 测试）
5. 风险点与是否需要后续转入领域 skill

## 执行检查单

1. 至少找 3 个项目内相似实现。
2. 先定验收，再决定是先出计划还是直接动代码。
3. 拆成小步修改，保持每步都可验证。
4. 规划完成后转入对应领域 skill：前端走 `create-frontend-component` / `create-zustand-store`，后端走 `create-backend-module` / `prisma-workflow` / `implement-system-log`。
5. 验证默认优先级：LSP → lint / typecheck → 测试；`install / dev / build / preview / start` 不是默认步骤。

若需求边界不清、方案存在分歧或改动范围较大，先把验收契约、TODO 与验证路径同步给用户，再进入代码阶段。若目标明确且改动较小，可以在说明执行路径后直接落地，不为了流程本身阻塞任务。

## 反模式

- 不要跳过验收契约直接开改。
- 不要在没有相似实现时自造新模式。
- 不要默认执行 `install / dev / build / preview / start`。

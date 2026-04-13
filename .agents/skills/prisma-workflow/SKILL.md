---
name: prisma-workflow
description: 当用户要修改 Prisma schema、seed、生成客户端，或处理数据库结构与落库逻辑相关任务时使用；重点控制变更顺序、同步项、验证方式与风险边界。
---

# Prisma 工作流规范

## 何时用

- 改 `schema.prisma`
- 改 seed / Prisma Client / 表结构

## 执行检查单

1. 先确认是否真是数据库结构改动。
2. 改 schema 后同步检查 service、DTO、共享类型、前端消费；类型契约细则转 `type-contract-guidelines`。
3. 只执行最小必要的 Prisma 命令：`generate` / `migrate` / `db push` / `db seed`。
4. 涉及迁移时补齐影响范围与回滚方式。
5. 破坏性迁移、删字段、改关系前先确认影响范围，再执行命令。

## 验收检查

- Prisma Client 已更新。
- 上下游类型与查询逻辑已同步。
- seed / 默认数据 / 依赖常量无遗漏。

## 反模式

- 不要只改 schema 不改上下游类型与查询逻辑。
- 不要把 Prisma 任务扩大成无关的 `install / dev / build`。

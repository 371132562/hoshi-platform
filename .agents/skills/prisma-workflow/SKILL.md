---
name: prisma-workflow
description: 修改 Prisma schema、seed、生成客户端或处理数据库结构相关任务时使用，负责变更顺序、验证与风险控制。
---

# Prisma 工作流规范

开始前先阅读 `backend/AGENTS.md`，本 skill 只补充数据库结构变更的执行顺序与风险控制。

## 适用场景

- 修改 `backend/prisma/schema.prisma`
- 新增或调整 seed 数据
- 需要重新生成 Prisma Client
- 涉及表结构、字段、索引、关系调整

## 执行顺序

1. 先确认这是数据库结构改动还是单纯查询逻辑改动。
2. 修改 `schema.prisma` 后，评估影响模块、DTO、前端共享类型与 seed。
3. 运行 Prisma Client 生成。
4. 如涉及迁移，明确迁移策略与回滚方式。
5. 同步检查 service 查询、写入、筛选和排序逻辑是否需要跟进。

## 项目约定

- 数据库访问统一通过 `PrismaService`。
- 共享给前端的字段变化要同步影响 `backend/src/types/*` 与前端消费处。
- 破坏性迁移、删除字段、修改关系前必须先确认影响范围。

## 验收检查

- Prisma Client 已重新生成。
- 相关 service / dto / pipe / 前端类型消费已同步。
- 种子数据、默认数据、依赖常量没有遗漏。

## 反模式

- 不要只改 schema 不改上下游类型与查询逻辑。
- 不要在数据库结构变更后跳过生成与验证。
- 不要把迁移风险留给后续接手者口头理解。

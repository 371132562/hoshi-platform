---
name: ant-design-docs
description: 在使用 Ant Design 组件、API、交互模式或示例时使用，指导 OpenCode/Codex 优先消费 ant.design 的 llms.txt、llms-full-cn.txt 与组件 markdown 文档。
---

# Ant Design 文档消费规范

## 适用场景

- 新增或修改 Ant Design 组件用法
- 需要确认组件 API、受控方式、示例写法、交互组合模式
- 需要让 OpenCode / Codex 基于官方文档回答 Ant Design 问题

## 官方文档源

优先使用以下官方文本入口，而不是说明页：

1. `https://ant.design/llms.txt`：文档索引
2. `https://ant.design/llms-full-cn.txt`：中文完整文档
3. `https://ant.design/components/<component>-cn.md`：组件级中文 markdown

如中文资源缺失，再退回英文：

1. `https://ant.design/llms-full.txt`
2. `https://ant.design/components/<component>.md`

## 推荐读取顺序

1. 先读 `llms.txt`，确认目标组件或页面模式的落点。
2. 单组件问题，直接读对应 `components/*-cn.md`。
3. 多组件联动或需要整体模式时，再读 `llms-full-cn.txt`。
4. 输出方案时，优先引用官方 API、受控属性和注意事项，不凭记忆臆断。

## OpenCode / Codex 用法

- 当前优先依赖 OpenCode 的 `webfetch` 获取上述 URL 内容。
- 不要假设 OpenCode 或 Codex 已原生自动接入 `llms.txt`。
- 若项目后续接入了稳定的 Ant Design MCP，再评估是否升级为 MCP 优先。

## 反模式

- 不要把 `https://ant-design.antgroup.com/docs/react/llms-cn` 这类介绍页当成主要机器输入源。
- 不要一上来就读取完整 `llms-full-cn.txt`，导致上下文被无关组件占满。
- 不要只依据模型旧知识回答 Ant Design 版本相关 API 问题。

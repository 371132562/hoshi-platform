---
name: wsl-windows-command-bridge
description: 在 WSL 中操作位于 Windows 文件系统且依赖由 Windows 安装的项目时使用，统一决定何时改走 Windows PowerShell 执行依赖相关命令。
---

# WSL / Windows 跨环境命令桥接规范

## 何时必须用

满足以下条件时，**必须先参考本 skill** 再执行命令：

1. 当前运行环境是 WSL
2. 项目工作目录位于 Windows 文件系统（例如 `/mnt/c/*`、`/mnt/d/*`）
3. 需要执行依赖、构建链或原生模块敏感命令

典型命令包括但不限于：

- `pnpm` / `npm` / `node`
- `prisma generate` / `prisma db push` / `prisma db seed`
- `nest build` / `vite build` / `tsc` / `eslint`
- `install / dev / start / build / seed / generate`
- 任何会加载原生依赖、访问 SQLite WAL/SHM、写锁文件或触发 postinstall 的命令

## 目标

避免以下问题：

- 依赖安装在 Windows，但在 WSL/Linux 下执行导致原生模块 ABI 不匹配
- `better-sqlite3` / `rollup` / `swc` / Prisma adapter 等依赖因宿主环境不一致报错
- 同一 SQLite 文件被 WSL 与 Windows 进程混用，出现 `disk I/O error`、`database disk image is malformed`、WAL/SHM 异常
- 锁文件、缓存目录、postinstall 产物分别由两个宿主环境写入，导致结果不一致

## 决策规则

### 规则 1：纯文件操作、搜索、阅读

继续在当前 WSL 环境执行即可。

适用范围：

- `read` / `grep` / `glob` / `lsp_*`
- 纯文本编辑
- 不触发 Node/包管理器/数据库驱动的命令

### 规则 2：依赖相关命令

如果是 WSL + Windows 文件系统项目，并且命令会触发依赖加载或构建链，**优先改走 Windows PowerShell**。

推荐形式：

```bash
powershell.exe -NoProfile -Command "Set-Location 'D:\work\hoshi-platform\backend'; pnpm exec prisma db seed"
```

如需切换前端目录：

```bash
powershell.exe -NoProfile -Command "Set-Location 'D:\work\hoshi-platform\frontend'; pnpm lint"
```

### 规则 3：原生 Linux 宿主机

如果当前环境本身就是原生 Linux，且依赖也安装在 Linux 环境中，按正常方式执行，不需要走 PowerShell。

## PowerShell 执行要求

1. 使用 `powershell.exe -NoProfile -Command`，减少环境噪声
2. 用 `Set-Location` 进入 Windows 路径，不要依赖 WSL 路径自动转换
3. Windows 路径使用盘符路径，例如 `D:\work\hoshi-platform\backend`
4. 一次只执行最小必要命令，不把长串无关动作塞进一条命令里
5. 需要读写同一个 SQLite 文件时，尽量让相关命令都在同一宿主侧完成

## 推荐转换示例

### Prisma / SQLite

```bash
powershell.exe -NoProfile -Command "Set-Location 'D:\work\hoshi-platform\backend'; pnpm generate"
powershell.exe -NoProfile -Command "Set-Location 'D:\work\hoshi-platform\backend'; pnpm exec prisma db push --force-reset --accept-data-loss"
powershell.exe -NoProfile -Command "Set-Location 'D:\work\hoshi-platform\backend'; pnpm exec prisma db seed"
```

### 前端检查

```bash
powershell.exe -NoProfile -Command "Set-Location 'D:\work\hoshi-platform\frontend'; pnpm lint"
powershell.exe -NoProfile -Command "Set-Location 'D:\work\hoshi-platform\frontend'; pnpm exec tsc -p tsconfig.app.json --noEmit"
```

### 后端检查

```bash
powershell.exe -NoProfile -Command "Set-Location 'D:\work\hoshi-platform\backend'; pnpm lint"
```

## 反模式

- 不要在 WSL 中直接执行依赖已安装于 Windows 的原生模块敏感命令，再在 Windows 中继续读写同一产物
- 不要把“环境问题”误判成“业务代码问题”
- 不要把临时环境适配长期写入业务代码；优先通过命令执行宿主切换解决
- 不要一边在 WSL 启动进程，一边在 Windows 侧重置同一个 SQLite 文件

## 最小结论

一句话判断：

> 当前在 WSL 中，但项目位于 `/mnt/<盘符>/...` 且命令会触发 Node / pnpm / Prisma / SQLite / 原生模块时，优先通过 Windows PowerShell 执行；只有纯文件类操作继续留在 WSL。

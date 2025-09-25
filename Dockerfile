# urbanization/Dockerfile

# --- 基础构建阶段 ---
# 使用 Node.js 22 作为基础镜像，用于所有构建操作
FROM node:22-alpine AS builder

# 声明一个构建参数，用于接收 DATABASE_URL 的值
ARG DATABASE_URL_BUILD

# 将构建参数的值赋给环境变量 DATABASE_URL
# 这样在构建时，如 Prisma 生成等操作就可以使用这个数据库URL
ENV DATABASE_URL ${DATABASE_URL_BUILD}

# 设置工作目录
WORKDIR /app

# 复制 monorepo 的 pnpm 相关文件
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY pnpm-workspace.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 复制所有项目文件到构建环境
# 注意：这里将整个 monorepo 复制进去，确保所有子项目文件都可用
COPY frontend ./frontend
COPY backend ./backend

# 安装所有项目的依赖（使用 pnpm workspace）
# 切换到monorepo根目录执行 install，确保所有子项目依赖被安装
RUN pnpm install --frozen-lockfile

# --- 后端构建步骤 (在 builder 阶段完成) ---
WORKDIR /app/backend

# 生成 Prisma 客户端
# 这将在 backend/node_modules/.prisma 目录下生成客户端
RUN npx prisma generate

# 构建后端项目
RUN pnpm build

# --- 前端构建步骤 (在 builder 阶段完成) ---
WORKDIR /app/frontend

# 构建前端项目
# 前端构建依赖于后端生成的 Prisma 客户端（例如用于类型生成或API客户端）
# 确保在前端的 package.json 中配置了正确的构建命令，可能包含类型生成步骤
RUN pnpm build

# --- 最终运行阶段 ---
FROM node:22-alpine AS runner
WORKDIR /app

# 从 builder 阶段复制必要的文件
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY pnpm-workspace.yaml ./

# 复制完整打包产物
COPY --from=builder /app/node_modules ./node_modules

# 复制前端打包产物
COPY --from=builder /app/frontend/dist ./frontend/dist

# 复制后端打包产物
COPY --from=builder /app/backend ./backend

# 复制entrypoint脚本
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# 设置运行时环境变量
# 确保运行时也有 DATABASE_URL，因为 Prisma migrate 和你的应用都需要它
# 如果你的应用在运行时也需要 DATABASE_URL，这一步非常关键。
# 这里我们直接从构建阶段继承 DATABASE_URL_BUILD 的值
ENV NODE_ENV production
ENV DATABASE_URL ${DATABASE_URL_BUILD}

# 暴露后端端口
EXPOSE 3333

# 使用ENTRYPOINT执行启动脚本
ENTRYPOINT ["./entrypoint.sh"]
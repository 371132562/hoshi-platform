# Hoshi 平台

## 项目简介

本项目是一个基于 React + NestJS 的现代化管理平台模板，采用前后端分离架构，提供完整的用户认证、权限管理、组织管理、文章管理等功能，支持灵活的权限控制和模块化扩展。

## 功能特性

### 核心功能

- **用户管理**：完整的用户增删改查、密码加密、组织关联
- **角色管理**：角色创建、权限分配、基于路由的细粒度权限控制
- **组织管理**：树状组织结构、支持无限层级
- **文章管理**：文章发布、富文本编辑、图片上传、展示顺序配置
- **系统日志**：操作日志记录、日志查询
- **文件上传**：图片上传、文件哈希去重、存储管理
- **系统维护**：数据备份、系统监控

### 技术特性

- **JWT 认证**：安全的 Token 认证机制，两步登录流程
- **权限控制**：基于角色和路由的动态权限系统
- **软删除**：数据安全删除机制，支持数据恢复
- **类型安全**：前后端 TypeScript 类型共享，确保类型一致性
- **并发控制**：接口限流保护，防止恶意请求
- **日志系统**：Winston 日志框架，支持日志文件轮转

## 技术栈

### 前端

- **框架**: React 18.3.1 + TypeScript 5.9.3
- **构建工具**: Vite 6.3.5
- **状态管理**: Zustand 5.0.9
- **UI组件库**: Ant Design 6.1.3
- **路由**: React Router 7.11.0
- **样式方案**: Tailwind CSS 4.1.18 + Ant Design + Less 4.5.1
- **图表**: ECharts 6.0.0
- **富文本编辑器**: WangEditor 5.1.23
- **拖拽**: @dnd-kit 6.x
- **Markdown**: react-markdown + remark-gfm
- **加密**: crypto-js 4.2.0
- **日期处理**: dayjs 1.11.19
- **Excel**: xlsx 0.18.5
- **错误边界**: react-error-boundary 6.0.2

### 后端

- **框架**: NestJS 11.1.11 + TypeScript
- **数据库**: SQLite + better-sqlite3 12.5.0 + Prisma 7.2.0
- **认证**: JWT + Passport + bcrypt 6.0.0
- **文件上传**: Multer 2.0.2
- **日志**: Winston 3.19.0 + winston-daily-rotate-file 5.0.0
- **限流**: @nestjs/throttler 6.5.0
- **静态文件**: @nestjs/serve-static 5.0.4
- **参数校验**: class-validator 0.14.3 + class-transformer 0.5.1

### 开发工具

- **包管理器**: pnpm (monorepo)
- **代码规范**: ESLint 9.39.2 + Prettier 3.7.4
- **类型检查**: TypeScript ESLint 8.52.0
- **代码分析**: rollup-plugin-visualizer 6.0.5

## 项目结构

```
hoshi-platform/
├── frontend/                      # 前端项目
│   ├── src/
│   │   ├── components/           # 公共组件
│   │   ├── pages/                # 页面组件
│   │   │   ├── ArticleManagement/   # 文章管理
│   │   │   ├── Home/               # 首页
│   │   │   ├── Login/              # 登录页
│   │   │   └── System/             # 系统管理
│   │   │       ├── OrganizationManagement/  # 组织管理
│   │   │       ├── RoleManagement/          # 角色管理
│   │   │       ├── SystemMaintenance/      # 系统维护
│   │   │       └── UserManagement/         # 用户管理
│   │   ├── router/              # 路由配置
│   │   ├── services/             # API 服务封装
│   │   │   ├── apis.ts          # API 端点常量
│   │   │   └── base.ts          # Fetch 封装
│   │   ├── stores/               # Zustand 状态管理
│   │   ├── types/                # 前端类型定义
│   │   ├── utils/                # 工具函数
│   │   ├── index.css             # 全局样式
│   │   ├── main.tsx              # 应用入口
│   │   └── vite-env.d.ts         # Vite 类型声明
│   ├── public/                    # 静态资源
│   └── .env                       # 环境变量
├── backend/                       # 后端项目
│   ├── src/
│   │   ├── businessModules/      # 业务模块
│   │   │   └── article/          # 文章模块
│   │   ├── commonModules/        # 通用模块
│   │   │   ├── auth/             # 认证模块
│   │   │   ├── concurrency/      # 并发控制
│   │   │   ├── organization/     # 组织模块
│   │   │   ├── role/             # 角色模块
│   │   │   ├── systemLogs/       # 系统日志
│   │   │   ├── upload/           # 文件上传
│   │   │   └── user/             # 用户模块
│   │   ├── common/               # 通用基础
│   │   │   ├── decorators/       # 装饰器
│   │   │   ├── exceptions/       # 异常处理
│   │   │   ├── filters/          # 全局过滤器
│   │   │   ├── guards/           # 路由守卫
│   │   │   ├── interceptors/     # 拦截器
│   │   │   └── pipes/            # 管道
│   │   ├── types/                # 类型定义（前后端共享）
│   │   │   ├── dto.ts            # DTO 定义
│   │   │   └── response.ts       # 响应类型
│   │   ├── app.module.ts         # 根模块
│   │   └── main.ts               # 入口文件
│   ├── prisma/
│   │   ├── schema.prisma         # 数据库模型
│   │   └── seed.js               # 初始化数据
│   ├── scripts/                   # 脚本工具
│   └── types/                    # 共享类型导出
├── .agent/                        # Agent 临时文件目录
├── AGENTS.md                      # Agent 工作规范
├── pnpm-workspace.yaml           # pnpm workspace 配置
└── README.md                     # 项目文档
```

## 数据库设计

### 核心模型

| 模型             | 说明         | 关键特性                             |
| ---------------- | ------------ | ------------------------------------ |
| **Organization** | 组织部门     | 树状结构、软删除、自关联             |
| **Role**         | 角色         | 路由权限 (JSON)、软删除              |
| **User**         | 用户         | 密码加密、角色关联、组织关联、软删除 |
| **Article**      | 文章         | 富文本、图片数组、文章类型、软删除   |
| **ArticleOrder** | 文章展示顺序 | 页面配置、文章排序                   |
| **Image**        | 上传图片     | 文件哈希去重、软删除                 |

## 开发说明

### 开发环境要求

- Node.js >= 20
- pnpm >= 8
- Git

### 安装依赖

```bash
# 安装根目录依赖（会自动安装子项目依赖）
pnpm install

# 初始化 Prisma 客户端（首次或 schema 变更后必须执行）
cd backend && npx prisma generate && npx prisma migrate dev

# 首次运行时必须执行：初始化基础数据和超管账号
cd backend && npx prisma db seed
```

### 启动开发服务器

```bash
# 启动后端服务（端口：3888）
cd backend
pnpm start:dev

# 启动前端服务（端口：5173）
cd frontend
pnpm dev
```

### 数据库操作

```bash
cd backend

# 生成 Prisma 客户端
npx prisma generate

# 开发环境数据库迁移
npx prisma migrate dev

# 数据库初始化数据
npx prisma db seed

# 查看数据库（可视化界面）
npx prisma studio
```

## 开发规范

### 项目架构

- **Monorepo 结构**：frontend 和 backend 两个子项目，统一使用 pnpm 管理
- **依赖复用**：通用依赖安装在根目录，避免重复安装
- **TypeScript 开发**：前后端均使用 TypeScript，确保类型安全
- **代码注释**：核心业务逻辑必须添加中文功能解释注释

### 类型系统规范

- **请求入参 DTO**：必须使用 class，配合 `class-validator` 和 `class-transformer` 进行运行时校验
- **响应数据**：优先使用 class 定义，前端以 type 消费（避免引入装饰器）
- **类型共享**：后端在 `backend/src/types/dto.ts` 统一导出，前端直接导入使用
- **禁止 any**：所有类型必须有明确定义，禁止使用 `any`

### 前端开发规范

#### 组件规范

- **组件命名**：PascalCase
- **文件命名**：camelCase
- **Props 类型**：必须明确定义 TypeScript 类型
- **表单处理**：使用受控组件，避免直接操作 DOM
- **依赖声明**：`useEffect` 必须明确声明依赖项
- **性能优化**：合理使用 `React.memo`，避免不必要的渲染
- **逻辑提取**：公共逻辑提取为自定义 Hook 或 HOC

#### 状态管理

- **Store 组织**：按业务模块拆分 store 文件（见 `frontend/src/stores/`）
- **导出方式**：每个 store 默认导出一个 `useXxxStore`，禁止解构导出
- **数据读取**：组件内使用 selector 读取（`useXxxStore(state => state.data)`）
- **非 React 场景**：使用 `useXxxStore.getState()` 读取状态

#### API 调用

- **端点定义**：API 地址统一在 `services/apis.ts` 中定义
- **请求封装**：使用 `services/base.ts` 中的 fetch 封装
- **数据层逻辑**：数据处理逻辑集中在 stores 中
- **错误处理**：错误处理统一在拦截器中处理

#### 样式规范

- **优先级**：Ant Design > Tailwind CSS > CSS Modules > Less
- **全局样式**：避免使用全局样式，保持视觉一致性
- **加载效果**：优先使用骨架屏
- **响应式**：确保桌面端和移动端都有良好的体验

### 后端开发规范

#### 接口设计

- **HTTP 方法**：所有接口统一使用 POST 方法
- **错误处理**：业务错误使用 `BusinessException` 配合 `ErrorCode`，新增错误类型在 `ErrorCode` 中定义
- **参数校验**：使用 class DTO + ValidationPipe，自定义 Pipe 处理业务校验
- **NestJS 最佳实践**：遵循模块化、依赖注入、装饰器等最佳实践

#### 数据库操作

- **ORM 框架**：使用 Prisma 处理所有数据库操作
- **事务处理**：涉及多表操作时使用事务
- **索引优化**：合理创建索引，提升查询性能
- **软删除**：所有表支持软删除，避免数据永久丢失

#### 代码质量

- **ESLint 校验**：所有代码必须通过 ESLint 校验
- **Git Commit**：提交信息格式：`feat:` / `fix:` / `chore:` + 简要描述
- **小步迭代**：每次修改尽量集中在相关模块，避免大范围修改

## 用户认证与权限管理

### 认证流程

- **认证方式**：JWT Token 认证
- **登录接口**：两步登录流程
  1. `/auth/challenge` 获取盐值
  2. 前端使用 `crypto-js` 加密密码
  3. `/auth/login` 提交加密后的凭据
- **参数校验**：全局 ValidationPipe
  - `whitelist` / `forbidNonWhitelisted` / `transform` / `enableImplicitConversion`
  - 自定义 exceptionFactory：仅返回一条中文 `message`

### 权限控制

- **路由配置**：在 `frontend/src/router/routesConfig.tsx` 中统一配置
- **动态生成**：运行时由 `frontend/src/router.tsx` 动态生成 `RouteObject[]`
- **权限字段**：
  - `adminOnly: true`：系统管理菜单仅超管可见，不参与权限分配
  - 其余菜单基于角色的 `allowedRoutes` 精确到叶子路由筛选

### 初始数据

通过 `backend/prisma/seed.js` 初始化：

- **超管角色**：自动创建 `admin` 角色，可访问所有菜单
- **超管用户**：
  - 账号：`88888888`
  - 密码：`88888888`
  - 角色：绑定 admin 角色

## 环境配置

### 前端环境变量（`.env`）

```bash
# 部署路径（子路径部署时修改，如 /hoshi-platform）
VITE_DEPLOY_PATH=/

# API 基础地址
VITE_API_BASE_URL=/api
```

### 后端环境变量（`.env`）

```bash
# 服务端口
PORT=3888

# 部署路径（影响 API 路径前缀和静态文件解析）
DEPLOY_PATH=/

# 上传文件存储目录
UPLOAD_DIR=./db/images

# JWT 密钥（生产环境必须修改）
JWT_SECRET=your-secret-key-change-in-production

# JWT 过期时间（秒）
JWT_EXPIRATION=604800
```

## 部署说明

> ⚠️ **重要提示**：以下配置仅供参考，请根据实际部署环境调整。

### 方式一：Docker 部署（简单模式）

适用于快速部署，前后端一体化打包。

**快速启动**：

```bash
# 拉取镜像并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f
```

**访问方式**：

- 前端：`http://IP:1818`
- API：`http://IP:1818/api/`
- 图片：`http://IP:1818/images/`

**注意事项**：

- 由于 @nestjs/serve-static 限制，子路径部署时刷新页面可能 404
- 数据持久化：Docker 卷 `db_main` 自动管理数据库和上传文件

### 方式二：Nginx 反向代理部署（推荐）

适用于自定义部署路径和生产环境。

**环境配置**：

```bash
# 后端 .env
DEPLOY_PATH="/"
PORT="3888"
UPLOAD_DIR="./db/images"

# 前端 .env.production
VITE_DEPLOY_PATH=/hoshi-platform
```

**构建步骤**：

```bash
# 安装依赖
pnpm install --frozen-lockfile

# 构建前端
cd frontend
pnpm build

# 构建后端
cd ../backend
npx prisma generate
npx prisma migrate deploy
npx prisma db seed  # 首次部署必须执行
pnpm build
```

**Nginx 配置示例**：

```nginx
server {
    listen 80;
    server_name localhost;

    # API 反向代理
    location /hoshi-platform/api/ {
        proxy_pass http://127.0.0.1:3888/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        client_max_body_size 10M;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 图片静态文件代理
    location /hoshi-platform/images/ {
        proxy_pass http://127.0.0.1:3888/images/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 前端静态文件
    location /hoshi-platform {
        rewrite ^/hoshi-platform$ /hoshi-platform/ permanent;
    }

    location /hoshi-platform/ {
        alias /var/www/hoshi-platform/frontend/dist/;
        index index.html;
        try_files $uri $uri/ /hoshi-platform/index.html;

        # 设置正确的 MIME 类型
        location ~* \.(js|mjs)$ { add_header Content-Type application/javascript; }
        location ~* \.css$   { add_header Content-Type text/css; }
        location ~* \.(png|jpg|jpeg|gif|ico|svg)$ { add_header Content-Type image/png; }
    }
}
```

## 常见问题

### 文件上传接口错误

**问题**：访问上传接口时出现 Nginx 错误

**解决方案**：

1. 检查 Nginx 临时文件目录权限
2. 检查后端服务是否正常运行（端口 3888）
3. 验证 Nginx 配置中 API 代理优先级

### 图片访问 404

**问题**：上传的图片无法访问

**解决方案**：

1. 检查 Nginx 是否配置了 `/images/` 路径代理
2. 检查后端 `UPLOAD_DIR` 配置是否正确
3. 验证图片文件是否正确保存

### Prisma 客户端未生成

**问题**：启动时报 Prisma 客户端相关错误

**解决方案**：

```bash
cd backend
npx prisma generate
```

## 许可证

ISC License

## 联系方式

- GitHub Issues: https://github.com/371132562/Urbanization/issues

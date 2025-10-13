# 模版平台

## 项目简介

本项目是一个基于React + NestJS的管理平台模板，采用前后端分离架构，支持用户管理、角色管理、文章管理等功能。

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand
- **UI组件库**: Ant Design 5
- **路由**: React Router 7
- **样式**: Tailwind CSS + Ant Design
- **图表**: ECharts
- **富文本编辑器**: WangEditor

### 后端
- **框架**: NestJS + TypeScript
- **数据库**: SQLite + Prisma ORM
- **文件上传**: Multer
- **日志**: Winston
- **静态文件服务**: @nestjs/serve-static

## 项目结构

```
Urbanization/
├── frontend/                 # 正式前端项目
│   ├── src/
│   │   ├── components/      # 公共组件
│   │   ├── pages/          # 页面组件
│   │   ├── stores/         # 状态管理
│   │   ├── services/       # API服务（基于 fetch 的实例在 services/base.ts）
│   │   ├── types/          # 类型定义（见 src/types/index.ts）
│   │   └── utils/          # 工具函数
│   ├── public/             # 静态资源
│   └── dist/               # 构建输出
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── businessModules/  # 业务模块
│   │   ├── commonModules/    # 公共模块
│   │   ├── common/           # 公共文件
│   │   ├── exceptions/       # 异常处理（common/exceptions）
│   │   ├── interceptors/     # 拦截器（common/interceptors）
│   │   ├── upload/           # 文件上传（commonModules/upload + common/upload）
│   │   └── utils/            # 工具函数
│   ├── prisma/               # 数据库配置
│   └── types/                # 类型定义（统一从 src/dto/* 通过 backend/types/dto.ts 导出）
```

## 开发说明

### 开发环境要求

- Node.js >= 20
- pnpm >= 8
- Git

### 安装依赖

```bash
# 安装根目录依赖
pnpm install

# 初始化 Prisma 客户端（首次或 schema 变更后建议执行）
cd backend && npx prisma generate && npx prisma migrate dev

# 首次运行时必须执行：初始化大洲/国家/指标体系/超管账号等
cd backend && npx prisma db seed
```

### 开发规范

#### 项目架构与开发规范
- 此项目是monorepo项目，包含frontend和backend两个子项目
- 依赖管理统一使用pnpm，部分依赖会安装在根目录下的package中，避免重复安装
- 前端使用Vite作为构建工具
- 前端后端均使用TypeScript开发
- 每次单步生成尽量修改相关性较强的模块和文件，避免大范围修改不同模块
- 代码中必须书写简洁明了的功能解释中文注释
- 文件名命名优先采用驼峰命名法camelCase
- git commit 要符合规范，以feat，fix，chore等开头然后书写具体内容

#### 类型系统规范
- 请求入参 DTO 必须使用 class，并配合 class-validator/class-transformer 进行运行时校验与转换；响应可使用 class 或 type，前端以 type 消费
- 前后端类型共享策略：
  - 后端在 `backend/src/dto/*.dto.ts` 定义 class DTO 与必要的 type
  - `backend/types/dto.ts` 统一 `export *` 暴露 DTO 与相关类型
  - 前端仅导入 type（或通过 `InstanceType<typeof XxxDto>` 推导），避免打包装饰器逻辑
- 仍然优先使用 `type`（而非 interface）声明通用结构与工具类型；禁止使用 any
- 所有请求/响应结构必须有明确的 TypeScript 类型
- 所有代码必须通过 ESLint 校验

##### 何时使用 class / type（关键建议）
- 入参（后端 Controller 接口入参、服务层业务入参）：优先使用 class DTO，结合 `class-validator` 与 `class-transformer` 支持运行时校验与转换。
- 响应数据（后端返回给前端的数据模型）：
  - 对外响应结构推荐定义为 class（便于与 DTO 对齐与转换），但在前端消费侧以 `type` 表达（仅做编译期约束，避免引入装饰器）。
  - 若响应是纯结构化数据且无运行时转换/装饰器需求，也可直接以 `type` 约束（后端内部可将实体映射为 `type` 所需形状）。
- 领域模型/实体：使用 class（承载领域行为与不变量，便于单元测试）。
- 纯结构、工具与派生类型（联合/交叉、映射类型、Pick/Omit 等）：使用 `type`。

示例（简化示例，仅示意）：
```ts
// 后端：请求入参 DTO（class）
export class CreateUserDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

// 后端：响应 DTO（class）
export class UserResponseDto {
  id: string;
  username: string;
}

// 前端：响应消费（type，仅编译期约束）
export type UserResponse = {
  id: string;
  username: string;
};
```

#### 前端开发规范
- 组件命名采用PascalCase
- pages目录下的页面组件应专注于界面展示，避免复杂数据处理逻辑
- Props必须明确定义TypeScript类型
- 使用受控组件处理表单，避免直接操作DOM
- useEffect必须明确声明依赖项
- 使用React.memo优化组件性能
- 公共逻辑提取为自定义Hook或HOC
- 变量/函数使用camelCase，类/接口用PascalCase，常量用UPPER_SNAKE_CASE
- api地址写在apis.ts文件中,在stores文件中进行调用和数据层的逻辑

#### 前端样式规范
- 样式方案优先级：Ant Design > Tailwind CSS > CSS Modules
- 避免使用全局样式
- 保持全局风格一致性
- 加载效果优先使用骨架屏

#### 状态管理与API调用
- 统一使用Zustand进行状态管理
- 数据处理逻辑集中在stores目录
- API地址统一在services/apis.ts或common.ts中定义
- 使用services/base.ts中的 fetch 封装处理请求
- 错误处理统一在拦截器中处理
- 组件中避免直接调用API

#### 后端开发规范
- 接口必须统一使用POST方法
- 业务错误需返回合适的Error信息，优先使用自定义的BusinessException搭配ErrorCode
- 新增错误类型时在ErrorCode中定义
- 遵循NestJS最佳实践
- 使用Prisma处理数据库操作

### 数据库操作

```bash
# 生成Prisma客户端
cd backend
npx prisma generate

# 开发环境数据库迁移
npx prisma migrate dev

# 数据库初始化数据
npx prisma db seed

# 查看数据库
npx prisma studio
```

### 启动开发服务器

```bash
# 启动后端服务
cd backend
pnpm start:dev

# 启动前端服务
cd frontend
pnpm dev
```

## 用户认证与权限管理

### 认证与校验
- **认证方式**: JWT Token认证
- **登录接口**: `/auth/login`（两步登录：/auth/challenge 获取盐 → 前端加密 → /auth/login 提交）
- **参数校验**: 全局 ValidationPipe（whitelist/forbidNonWhitelisted/transform/enableImplicitConversion）
  - 自定义 exceptionFactory：仅返回一条中文 `message`（可选附加 `data`）
  - 全局异常过滤器统一包装为 HTTP 200，业务码见 `code`

### 路由权限配置
- **路由配置**: 在 `frontend/src/router/routesConfig.tsx` 中统一配置，运行时由 `frontend/src/router.tsx` 动态生成 `RouteObject[]`
- **权限字段**:
  - `adminOnly: true`: 系统管理菜单仅超管可见，不参与权限分配
  - 其余菜单基于角色的 `allowedRoutes` 精确到叶子路由筛选（见 `getFilteredRoutes`）

### 初始数据
- **种子数据**: 通过 `backend/prisma/seed.js` 初始化
- **超管角色**: 自动创建 admin 角色，可访问所有菜单
- **超管用户**: 自动创建编号为 `88888888` 的超管用户，绑定 admin 角色
- **初始密码**: 超管初始密码为 `88888888`（账号与密码均为 8 个 8）

## Docker镜像讲解

本项目使用 GitHub Actions 进行自动化构建和 Docker 镜像发布：

### GitHub工作流
- **触发条件**: 推送代码到 `master` 分支时自动触发
- **构建内容**: 自动构建主客户端
- **发布方式**: 自动创建GitHub Release，包含所有客户端的运行包

## 部署说明

### 环境配置

项目使用环境变量进行配置，请根据部署环境创建相应的环境文件：

- 前端（示例 `.env.development` / `.env.production`）
  - `VITE_DEPLOY_PATH=/` 或 `/urbanization`（用于子路径部署，`router` 的 `basename` 来源）
  - `VITE_API_BASE_URL=/api`（后端全局前缀为 `/api`）

- 后端（示例 `.env`）
  - `PORT=3888`
  - `DEPLOY_PATH=/` 或 `/urbanization/`（影响API路径前缀和静态文件解析 `serveRoot`）
  - `UPLOAD_DIR=./db/images`（图片物理存储路径）

### 部署方式

> ⚠️ **重要提示**：以下所有配置文件和命令仅供参考，请根据实际部署环境和需求进行调整。

本项目支持两种部署方式：

#### 方式一：Docker 部署（简单部署模式）

本项目已配置完整的Docker部署方案，包含前后端一体化部署，适合需要简单部署方式的用户。
但是由于@nestjs/serve-static的限制，目前该方式配置env文件中部署路径，从而访问子path下的前端静态文件时，会造成前端子路由情况下刷新页面404，暂无法解决。目前对于SPA应用，nginx已经有成熟的方案解决这种问题。

**1. 部署特点**
- **一体化部署**: 前后端打包在同一个Docker镜像中，通过后端Nestjs提供前端静态文件解析服务，无需分别部署
- **自动构建**: 使用GitHub Actions自动构建并发布Docker镜像
- **数据持久化**: 通过Docker卷自动管理数据库、上传文件和日志
- **环境隔离**: 容器化部署，避免环境依赖问题

**2. 快速启动**
```bash
# 拉取最新镜像并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f
```

**3. 访问方式**
- **应用地址**: `http://IP:1818`
- **API接口**: `http://IP:1818/api/`（后端自动配置的全局前缀）
- **图片资源**: `http://IP:1818/images/`（静态文件服务）
- **前端页面**: `http://IP:1818/`（自动提供前端静态文件）

**4. 技术实现**
- **端口映射**: 容器内3888端口映射到主机1818端口
- **静态文件**: 后端自动提供前端构建产物和图片文件服务
- **数据库**: 自动执行Prisma迁移和种子数据初始化
- **重启策略**: 配置为`unless-stopped`，确保服务稳定性

**5. 数据持久化**
Docker卷`db_main`自动管理以下数据：
- 数据库文件: `./db/urbanization.db`
- 上传文件: `./db/images/`
- 日志文件: `./db/logs/`

#### 方式二：Nginx 反向代理部署（适用于自定义部署路径）

适用于需要将应用部署在特定路径下或需要更精细控制的场景，如 `http://yourdomain.com/urbanization/`。

**1. 环境配置**
```bash
# 后端环境配置 (.env.production)
DEPLOY_PATH="/"
PORT="3888"
UPLOAD_DIR="./db/images"

# 前端环境配置 (.env.production)
VITE_DEPLOY_PATH=/urbanization
```

**2. 依赖安装与构建**
```bash
# 安装依赖
pnpm install --frozen-lockfile

# 构建前端项目
cd frontend
pnpm build

# 构建后端项目
cd ../backend
npx prisma generate
npx prisma migrate deploy
npx prisma db seed # 部署项目时，首次运行必须执行，初始化基本数据和超管用户
pnpm build
```

**3. 后端服务启动**
```bash
# 启动后端服务（推荐使用pm2管理）
cd backend
node ./dist/src/main
```

**4. 静态文件部署**
```bash
# 创建nginx静态文件目录
sudo mkdir -p /var/www/urbanization/frontend/dist

# 复制前端构建产物
sudo cp -r frontend/dist/* /var/www/urbanization/frontend/dist/
```

**5. Nginx配置**
在nginx配置文件中添加以下server块配置：

```nginx
 server {
        listen       80;
        server_name  localhost;

        #charset koi8-r;

        #access_log  logs/host.access.log  main;

        # /urbanization/api/ 路径反向代理到本地3888端口（优先级最高）
        location /urbanization/api/ {
            proxy_pass http://127.0.0.1:3888/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # 处理跨域
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS, PUT, DELETE';
            add_header Access-Control-Allow-Headers 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization';

            # 处理 OPTIONS 预检
            if ($request_method = 'OPTIONS') {
                return 204;
            }

            # 文件上传与超时配置（需与后端 main.ts 限制相匹配）
            client_max_body_size 10M;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # /urbanization/images/ 路径反向代理到本地3888端口（图片静态文件）
        location /urbanization/images/ {
            proxy_pass http://127.0.0.1:3888/images/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # /urbanization 路径指向前端dist目录（支持带斜杠和不带斜杠的访问）
        location /urbanization {
            # 处理不带斜杠的访问，重定向到带斜杠的路径
            rewrite ^/urbanization$ /urbanization/ permanent;
        }
        
        location /urbanization/ {
            alias /var/www/urbanization/frontend/dist/;
            index index.html index.htm;
            try_files $uri $uri/ /urbanization/index.html;
            
            # 为JavaScript模块设置正确的MIME类型
            location ~* \.(js|mjs)$ { add_header Content-Type application/javascript; }
            # 为CSS文件设置正确的MIME类型
            location ~* \.css$   { add_header Content-Type text/css; }
            # 为其他静态资源设置正确的MIME类型
            location ~* \.(png|jpg|jpeg|gif|ico|svg)$ { add_header Content-Type image/png; }
            location ~* \.(woff|woff2|ttf|eot)$ { add_header Content-Type font/woff; }
        }

        # 默认路径配置
        location / {
            root   html;
            index  index.html index.htm;
        }

        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
```

**6. 重启Nginx**
```bash
# 检查配置语法
sudo nginx -t

# 重新加载配置
sudo nginx -s reload
```

**7. 访问方式**
- **前端页面**: `http://yourdomain.com/urbanization`
- **后端API**: `http://yourdomain.com/urbanization/api/exampleApi`
- **图片资源**: `http://yourdomain.com/urbanization/images/filename.jpg`

### 部署注意事项

#### 通用注意事项
1. **环境变量**: 确保生产环境的环境变量配置正确
2. **数据备份**: 定期备份数据库文件和上传文件
3. **端口冲突**: 确保部署端口未被占用
4. **资源限制**: 根据服务器配置调整资源限制
5. **网络配置**: 如需外部访问，请配置相应的防火墙规则

#### Docker部署注意事项
1. **镜像拉取**: 使用`docker-compose pull`获取最新镜像
2. **数据卷**: 数据卷`db_main`自动管理，无需手动配置
3. **端口冲突**: 确保主机1818端口未被占用
4. **服务管理**: 使用`docker-compose`命令管理服务生命周期
5. **日志查看**: 使用`docker-compose logs -f`查看实时日志
6. **数据库持久化**: SQLite数据库文件通过Docker卷自动持久化，容器重启数据不丢失
7. **数据库备份**: 可通过挂载数据卷到宿主机进行数据库文件备份

#### Nginx部署注意事项
1. **路径配置**: 确保`VITE_DEPLOY_PATH`与nginx配置中的路径一致
2. **静态文件**: 确保前端构建产物正确复制到nginx目录
3. **后端服务**: 确保后端服务在3888端口正常运行
4. **文件上传**: 确保nginx配置了正确的文件上传大小限制
5. **图片代理**: 确保nginx配置了图片静态文件代理路径

#### 常见问题排查

##### 文件上传接口问题
**问题描述**: 访问 `http://localhost/urbanization/api/upload` 时出现nginx错误页面，显示"An error occurred"。

**可能原因**:
1. **nginx临时文件目录权限不足**: nginx无法写入临时文件目录
2. **后端服务未启动**: 3888端口无服务响应
3. **nginx配置错误**: location块匹配优先级问题

**解决方案(仅供参考，根据实际情况调整)**:

1. **修复nginx权限问题**:
```bash
# 修复nginx临时文件目录权限
sudo chown -R $(whoami):admin /usr/local/var/run/nginx
sudo chmod -R 755 /usr/local/var/run/nginx

# 重新加载nginx配置
sudo nginx -s reload
```

2. **检查后端服务状态**:
```bash
# 检查3888端口是否有服务运行
lsof -i :3888
```

3. **验证API代理配置**:
```bash
# 测试直接访问后端API
curl -X POST http://127.0.0.1:3888/api/upload -F "file=@/dev/null"

# 测试通过nginx代理访问API
curl -X POST http://localhost/urbanization/api/upload -F "file=@/dev/null"
```

**预期结果**: 
- 直接访问后端API应返回业务错误信息（如"不支持的文件类型"）
- 通过nginx代理访问应返回相同的业务错误信息
- nginx错误日志中不应出现权限相关错误

**注意事项**:
- 确保nginx配置中API代理location块位于静态文件location块之前
- 文件上传接口需要处理multipart/form-data格式，nginx需要足够的权限处理临时文件
- 建议定期检查nginx日志文件大小，避免日志文件过大影响性能

##### 图片静态文件访问问题
**问题描述**: 上传的图片无法通过 `http://localhost/urbanization/images/filename.jpg` 访问，显示404错误。

**可能原因**:
1. **nginx未配置图片代理**: 缺少 `/urbanization/images/` 路径的代理配置
2. **后端ServeStaticModule配置错误**: 图片服务路径配置不正确
3. **图片文件不存在**: 文件未正确保存到指定目录

**解决方案**:

1. **检查nginx配置**:
确保nginx配置中包含图片静态文件代理：
```nginx
# /urbanization/images/ 路径反向代理到本地3888端口（图片静态文件）
location /urbanization/images/ {
    proxy_pass http://127.0.0.1:3888/images/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

2. **检查后端配置**:
确保后端环境变量配置正确：
```bash
# backend/.env
UPLOAD_DIR="./db/images"
DEPLOY_PATH="/"
```
```
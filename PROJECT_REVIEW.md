# 项目评估与改进建议

本项目为 React + TypeScript + Zustand + Ant Design 前端、NestJS + Prisma + SQLite 后端的 monorepo 模板（frontend、backend，pnpm 管理）。文档总结当前状态、风险与改进方向。

## 一、现状概览
- 前端：主题色动态配置（frontend/src/main.tsx）、集中路由与菜单（frontend/src/router/routesConfig.tsx）、Zustand 状态（frontend/src/stores/*）、自封装 fetch 客户端（frontend/src/services/base.ts）。
- 后端：全局拦截/过滤（backend/src/app.module.ts）、Prisma 数据访问、两步登录 + JWT（backend/src/commonModules/auth），文章/角色/用户等业务模块。

## 二、主要问题与风险
1. 认证绕过：backend/src/commonModules/auth/jwt-auth.guard.ts 在无 token 时直接放行所有接口，完全依赖前端限制，存在高危越权风险。
2. 权限粒度缺失：后端未按角色/资源校验接口权限，allowedRoutes 仅用于前端菜单过滤，缺少基于角色的守卫或装饰器。
3. 配置与安全：app.module.ts 直接使用 UPLOAD_DIR 未校验，缺失时可能指向错误路径；CORS 全开放，未做白名单。静态目录与前端目录混用需谨慎。
4. 测试缺位：前后端均缺少单元/接口/E2E 测试及脚本，无法验证基础模板功能。
5. 接口规范不一致：前端 services/base.ts 支持 GET/PUT/DELETE，但后端约定接口全 POST，易产生调用误用。
6. 前端权限防护薄弱：Layout 内 hasPermission 仅控制菜单/UI，未做路由级 fallback（登录/403），依赖本地 allowedRoutes 与后端缺乏闭环。
7. 稳定性与一致性：文章/排序、角色/用户等跨表操作未使用 Prisma 事务；图片清理为 fire-and-forget，缺少失败重试与记录。
8. 可观测性：Winston 未提供切割/等级配置入口；系统日志读取接口可能缺分页/范围，处理大文件风险未控。
9. 体验与性能：路由生成每次运行时去重，路由多时缺少 memo/构建期生成；主题色样式内联未做缓存/SSR 友好处理。

## 三、架构改进建议
1) 鉴权闭环  
   - 后端：JWT Guard 仅在 @Public() 时放行；其他接口强制校验 token，并增加基于角色/资源的守卫（RolesGuard/权限装饰器），与 allowedRoutes 或 RBAC 权限表联动。  
   - 前端：路由层增加 loader/渲染前校验（调用 /auth/profile），失败统一跳转登录并清空状态。

2) 配置与安全  
   - 使用 @nestjs/config + Joi 校验必需 env（PORT/DEPLOY_PATH/UPLOAD_DIR/JWT_SECRET 等）；CORS 白名单化。  
   - 拆分上传静态目录与前端静态目录，避免路径穿透；对静态服务路径加默认值与存在性校验。

3) 数据一致性  
   - 文章+排序、角色+用户等操作使用 Prisma $transaction，确保原子性。  
   - 图片清理改为队列/补偿机制，失败可重试并留痕。

4) 可观测性  
   - Winston 增加按天切割、日志等级配置；接口耗时埋点（拦截器）。  
   - 日志读取接口增加分页/范围读取，避免一次读全文件。

5) 前端架构与体验  
   - 构建期生成路由/菜单/面包屑映射，运行时仅查表；为权限不足时的路由添加统一 403/登录跳转。  
   - 服务层统一 POST-only 规范，长耗时请求添加超时/重试策略配置；Skeleton/Loading 组件统一化。

6) 测试体系  
   - 后端：auth/article/role 的 e2e（supertest）和 service 单测（mock Prisma）。  
   - 前端：Zustand store 逻辑、路由授权逻辑、关键页面的 Vitest + Testing Library 组件测试。

## 四、细节改进清单（示例落地点）
- backend/src/commonModules/auth/jwt-auth.guard.ts：移除“无 token 放行”，仅 @Public() 可跳过；handleRequest 返回与前端约定一致的 code 字段。  
- backend/src/app.module.ts：校验 UPLOAD_DIR/DEPLOY_PATH，静态服务路径分离；CORS 白名单配置。  
- frontend/src/components/Layout/index.tsx：无权限时自动跳转登录或渲染统一 403；路由/菜单 useMemo 依赖静态化或构建期生成。  
- frontend/src/services/base.ts：收敛为 POST-only，或在接口层明确方法枚举；非 JSON 响应增加安全分支，重试策略可配置。  
- backend/src/businessModules/article/article.service.ts：create/update/delete/order 等引入 $transaction；cleanupImagesAsync 增加失败日志与重试队列。  
- backend/src/commonModules/auth/auth.service.ts：登录前统一校验用户 delete 状态；角色权限返回结构与前端 allowedRoutes 一致、去重。

## 五、推荐优先级
1. 立即修复：后端 JWT Guard 放行逻辑、权限守卫、env 校验（UPLOAD_DIR/JWT_SECRET）、CORS 白名单。  
2. 短期完善：事务化改造（文章/角色等）、权限闭环与路由级保护、日志读取分页。  
3. 中期提升：前端构建期路由映射、服务层 POST-only 规范与重试策略、图片清理队列化。  
4. 持续建设：前后端测试体系（unit/e2e）、可观测性（日志切割/耗时埋点）、性能体验优化。

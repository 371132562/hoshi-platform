import { LazyExoticComponent, ReactNode } from 'react'
import type {
  // 文章管理相关类型
  ArticleItem,
  ArticleListResponse,
  ArticleMetaItem,
  // 角色管理相关类型
  AssignRoleRoutes,
  // 认证相关类型
  CreateArticle,
  CreateOrganizationDto,
  CreateRole,
  // 用户管理相关类型
  CreateUserEncrypted,
  DeleteArticle,
  // 上传相关类型
  DeleteOrphans,
  DeleteRole,
  DeleteUser,
  ExportFormat,
  // 系统日志相关类型
  LogFileLevel,
  Login,
  LoginResponse,
  LogLineItem,
  LogUsersResDto,
  // 组织管理相关类型
  Organization,
  OrphanImagesResponse,
  PaginatedResponse,
  ReadLog,
  ReadUserLogReq,
  ResetUserPasswordEncrypted,
  RoleListItemDto,
  RoleListResDto,
  SystemLogFilesResDto,
  TokenPayloadDto,
  UpdateArticle,
  UpdateOrganizationDto,
  UpdateRole,
  UpdateUser,
  UploadResponse,
  UserItem,
  UserListResDto,
  UserLogFilesReq,
  UserProfileDto
} from 'template-backend/src/types/dto'

/**
 * 路由项类型定义
 */
export type RouteItem = {
  path: string
  title: string
  icon?: ReactNode
  component?: React.ComponentType | LazyExoticComponent<React.ComponentType>
  menuParent?: string // 指定父级菜单路径，设置后自动隐藏在菜单中
  hideInBreadcrumb?: boolean
  children?: RouteItem[]
  adminOnly?: boolean // 仅admin可见
}

// ==================== 类型导出 ====================
// 按功能模块分组导出，便于查找和维护

// 通用类型
export type { ExportFormat, PaginatedResponse }

// 认证相关类型
export type { Login, LoginResponse, TokenPayloadDto, UserProfileDto }

// 文章管理相关类型
export type {
  ArticleItem,
  ArticleListResponse,
  ArticleMetaItem,
  CreateArticle,
  DeleteArticle,
  UpdateArticle
}

// 角色管理相关类型
export type {
  AssignRoleRoutes,
  CreateRole,
  DeleteRole,
  RoleListItemDto,
  RoleListResDto,
  UpdateRole
}

// 用户管理相关类型
export type {
  CreateUserEncrypted,
  DeleteUser,
  ResetUserPasswordEncrypted,
  UpdateUser,
  UserItem,
  UserListResDto
}

// 系统日志相关类型
export type {
  LogFileLevel,
  LogLineItem,
  LogUsersResDto,
  ReadLog,
  ReadUserLogReq,
  SystemLogFilesResDto,
  UserLogFilesReq
}

// 上传相关类型
export type { DeleteOrphans, OrphanImagesResponse, UploadResponse }

// 组织管理相关类型
export type { CreateOrganizationDto, Organization, UpdateOrganizationDto }

/**
 * 带有 key 属性的组织树节点类型（AntD Tree 组件专用）
 */
export type OrganizationTreeNode = Omit<Organization, 'children'> & {
  key: string
  children?: OrganizationTreeNode[]
}

// 系统常量
export { SYSTEM_ADMIN_ROLE_NAME } from 'template-backend/src/types/constants'

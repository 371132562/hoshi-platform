import { LazyExoticComponent, ReactNode } from 'react'
import type {
  // 文章管理相关类型
  ArticleItemRes,
  ArticleListResDto,
  ArticleMetaItemRes,
  ArticleType,
  // 角色管理相关类型
  AssignRoleRoutesReq,
  // 通用分页参数
  CommonPageParams,
  // 认证相关类型
  CreateArticleReq,
  CreateOrganizationReqDto,
  CreateRoleReq,
  // 用户管理相关类型
  CreateUserEncryptedReq,
  DeleteArticleReq,
  // 上传相关类型
  DeleteOrphansReq,
  DeleteRoleReq,
  DeleteUserReq,
  ExportFormat,
  // 系统日志相关类型
  LogFileLevel,
  LoginReq,
  LoginResDto,
  LogLineItemRes,
  LogUsersResDto,
  // 组织管理相关类型
  OrganizationRes,
  OrphanImagesResDto,
  PaginatedResponse,
  ReadLogReq,
  ReadUserLogReq,
  ResetUserPasswordEncryptedReq,
  RoleListItemResDto,
  RoleListResDto,
  SystemLogFilesResDto,
  TokenPayloadResDto,
  UpdateArticleReq,
  UpdateOrganizationReqDto,
  UpdateRoleReq,
  UpdateUserReq,
  UploadResDto,
  UserItemRes,
  UserListResDto,
  UserLogFilesReq,
  UserProfileResDto
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
export type { CommonPageParams, ExportFormat, PaginatedResponse }

// 认证相关类型
export type { LoginReq, LoginResDto, TokenPayloadResDto, UserProfileResDto }

// 文章管理相关类型
export type {
  ArticleItemRes,
  ArticleListResDto,
  ArticleMetaItemRes,
  ArticleType,
  CreateArticleReq,
  DeleteArticleReq,
  UpdateArticleReq
}

// 角色管理相关类型
export type {
  AssignRoleRoutesReq,
  CreateRoleReq,
  DeleteRoleReq,
  RoleListItemResDto,
  RoleListResDto,
  UpdateRoleReq
}

// 用户管理相关类型
export type {
  CreateUserEncryptedReq,
  DeleteUserReq,
  ResetUserPasswordEncryptedReq,
  UpdateUserReq,
  UserItemRes,
  UserListResDto
}

// 系统日志相关类型
export type {
  LogFileLevel,
  LogLineItemRes,
  LogUsersResDto,
  ReadLogReq,
  ReadUserLogReq,
  SystemLogFilesResDto,
  UserLogFilesReq
}

// 上传相关类型
export type { DeleteOrphansReq, OrphanImagesResDto, UploadResDto }

// 组织管理相关类型
export type { CreateOrganizationReqDto, OrganizationRes, UpdateOrganizationReqDto }

/**
 * 带有 key 属性的组织树节点类型（AntD Tree 组件专用）
 */
export type OrganizationTreeNode = Omit<OrganizationRes, 'children'> & {
  key: string
  children?: OrganizationTreeNode[]
}

// 系统常量
export { SYSTEM_ADMIN_ROLE_NAME } from 'template-backend/src/types/constants'

import { LazyExoticComponent, ReactNode } from 'react'

/**
 * 路由项类型定义
 */
export type RouteItem = {
  path: string
  title: string
  icon?: ReactNode
  component?: React.ComponentType | LazyExoticComponent<React.ComponentType>
  hideInMenu?: boolean
  hideInBreadcrumb?: boolean
  children?: RouteItem[]
  adminOnly?: boolean // 仅admin可见
}

/**
 * @description 表格中每行国家的类型定义
 */
export type CountryRowData = {
  key: string
  countryId: string
  cnName: string
  enName: string
  urbanization: boolean
  continent: string
}

/**
 * @description 大洲数量统计表格每行的数据类型
 */
export type ContinentCountData = {
  key: string
  continent: string
  count: number
}

/**
 * 导出格式选项 - 用于前端渲染
 */
export const ExportFormatOptions = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'XLSX (Excel)' },
  { value: 'json', label: 'JSON' }
]

// 统一引入后端类型，供前端全局使用
import type {
  // 通用类型
  ApiResponse,
  // 文章管理相关类型
  ArticleItem,
  ArticleListResponse,
  ArticleMetaItem,
  // 角色管理相关类型
  AssignRoleRoutes,
  // 认证相关类型
  Challenge,
  CreateArticle,
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
  UpdateRole,
  UpdateUser,
  UploadResponse,
  UserItem,
  UserListResDto,
  UserLogFilesReq,
  UserProfileDto
} from 'template-backend/types/dto'

// 认证相关类型
export type { Challenge, Login, LoginResponse, TokenPayloadDto, UserProfileDto }

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

// 用户管理相关类型
export type {
  CreateUserEncrypted,
  DeleteUser,
  ResetUserPasswordEncrypted,
  UpdateUser,
  UserItem,
  UserListResDto
}

// 通用类型
export type { ApiResponse, ExportFormat, PaginatedResponse }

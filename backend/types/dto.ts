/* 所有需要用到的类型都放在这里 并按照业务逻辑分类 */
import { Article } from '@prisma/client';

// 导出Prisma模型类型
export { Article };

/*
 * ==================== 通用类型 ====================
 */

/**
 * 分页信息类型
 */
export type PaginationInfo = {
  page: number; // 当前页码，从1开始
  pageSize: number; // 每页数量
  total: number; // 总数量
  totalPages: number; // 总页数
};

/*
 * ==================== 用户管理模块 ====================
 */

/**
 * 用户相关类型
 */
export type UserItem = {
  id: string;
  code: string;
  name: string;
  department: string;
  email: string | null;
  phone: string | null;
  roleId: string | null;
  role?: RoleItem | null;
  createTime: Date;
  updateTime: Date;
};

export type CreateUserDto = {
  code: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  password: string;
  roleId?: string;
};

export type UpdateUserDto = {
  id: string;
  code?: string;
  name?: string;
  department?: string;
  email?: string;
  phone?: string;
  roleId?: string;
};

export type UserListResDto = UserItem[];

export type DeleteUserDto = {
  id: string;
};

export type ResetPasswordDto = {
  id: string;
  newPassword: string;
};

export type CreateUserEncryptedDto = {
  code: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  encryptedPassword: string;
  roleId?: string;
};

export type ResetUserPasswordEncryptedDto = {
  id: string;
  encryptedNewPassword: string;
};

/*
 * ==================== 角色管理模块 ====================
 */

/**
 * 角色相关类型
 */
export type RoleItem = {
  id: string;
  name: string;
  description: string | null;
  allowedRoutes: string[];
  createTime: Date;
  updateTime: Date;
};

export type CreateRoleDto = {
  name: string;
  description?: string;
  allowedRoutes?: string[];
};

export type UpdateRoleDto = {
  id: string;
  name?: string;
  description?: string;
  allowedRoutes?: string[];
};

export type RoleListDto = {
  page?: number;
  pageSize?: number;
  name?: string;
};

export type RoleListItemDto = RoleItem & {
  userCount: number;
};

export type RoleListResDto = RoleListItemDto[];

export type AssignRoleRoutesDto = AssignRoutesDto;

export type DeleteRoleDto = {
  id: string;
};

export type AssignRoutesDto = {
  id: string;
  allowedRoutes: string[];
};

/*
 * ==================== 文章管理模块 ====================
 */

/**
 * 文章相关类型
 */
export type ArticleItem = {
  id: string;
  title: string;
  content: string;
  images: string[];
  createTime: Date;
  updateTime: Date;
};

export type ArticleMetaItem = {
  id: string;
  title: string;
  createTime: Date;
  updateTime: Date;
};

export type CreateArticleDto = {
  title: string;
  content: string;
  images?: string[];
  deletedImages?: string[];
};

export type UpdateArticleDto = {
  id: string;
  title?: string;
  content?: string;
  images?: string[];
  deletedImages?: string[];
};

export type ArticleListDto = {
  page?: number;
  pageSize?: number;
  title?: string;
};

export type ArticleListResponse = {
  list: ArticleMetaItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type DeleteArticleDto = {
  id: string;
};

export type UpsertArticleOrderDto = {
  page: string;
  articles: string[];
};

export type ArticleOrderDto = {
  id: string;
  page: string;
  articles: string[];
  createTime: Date;
  updateTime: Date;
};

/*
 * ==================== 上传模块 ====================
 */

/**
 * 上传相关类型
 */
export type ImageItem = {
  id: string;
  filename: string;
  originalName: string;
  hash: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UploadResponse = {
  filename: string;
  originalName: string;
  url: string;
};

export type OrphanImageItem = {
  id: string;
  filename: string;
  originalName: string;
  createdAt: Date;
};

export type OrphanImagesResponse = {
  images: OrphanImageItem[];
  total: number;
};

export type DeleteOrphansDto = {
  imageIds: string[];
};

/*
 * ==================== 系统日志模块 ====================
 */

/**
 * 系统日志相关类型
 */
export type LogFileItem = {
  filename: string;
  size: number;
  lastModified: Date;
  date: string;
  level?: string;
};

export type LogFilesResponse = {
  files: LogFileItem[];
};

export type ReadLogDto = {
  filename: string;
  lines?: number;
};

export type ReadLogReqDto = ReadLogDto;
export type ReadUserLogReqDto = {
  filename: string;
  lines?: number;
  userId?: string;
};

export type LogContentResponse = {
  content: string;
  hasMore: boolean;
};

export type SystemLogFilesResDto = LogFilesResponse;
export type UserLogFilesReqDto = {
  page?: number;
  pageSize?: number;
  userId?: string;
};

export type LogUsersResDto = {
  users?: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  list?: Array<{
    userCode: string;
    userName: string;
  }>;
};

export type LogLineItem = {
  ts: string;
  level: string;
  message: string;
  raw: string;
  timestamp?: string;
  userId?: string;
  userName?: string;
};

export type LogFileLevel = 'info' | 'warn' | 'error' | 'debug';

export type SystemLogFileItem = LogFileItem;

export type UserLogItem = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ip: string;
  userAgent: string;
  createTime: Date;
};

export type UserLogsResponse = {
  logs: UserLogItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type UserLogsListDto = {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
};

/*
 * ==================== 认证模块 ====================
 */

/**
 * 认证相关类型
 */
export type LoginDto = {
  code: string;
  password: string;
};

export type ChallengeDto = {
  code: string;
  type?: string;
};

export type ChallengeResponse = string;

export type LoginResponse = {
  token: string;
  user: UserItem;
};

export type LoginResponseDto = LoginResponse;
export type UserProfileDto = UserItem;

export type LoginWithHashDto = {
  code: string;
  encryptedData: string;
};

export type TokenPayloadDto = {
  sub: string;
  code: string;
  name: string;
  userId: string;
  userName: string;
  roleId?: string;
  roleName?: string;
  iat?: number;
  exp?: number;
};

/*
 * ==================== 响应类型 ====================
 */

/**
 * 通用响应类型
 */
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
};

/**
 * 分页响应类型
 */
export type PaginatedResponse<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
};

export enum ExportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
  JSON = 'json',
}

export type SimpleCountryData = {
  id: string;
  cnName: string;
  enName: string;
};

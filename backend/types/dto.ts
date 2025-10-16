/* 统一导出所有 DTO class 和对应的 type */

// 用户模块
export * from '../src/businessModules/user/user.dto';

// 角色模块
export * from '../src/businessModules/role/role.dto';

// 文章模块
export * from '../src/businessModules/article/article.dto';

// 认证模块
export * from '../src/commonModules/auth/auth.dto';

// 系统日志模块
export * from '../src/commonModules/systemLogs/systemLogs.dto';

// 上传模块
export * from '../src/commonModules/upload/upload.dto';

/**
 * 通用类型定义
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

/**
 * 分页响应类型
 */
export type PaginatedResponse<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * 导出格式枚举
 */
export enum ExportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
  JSON = 'json',
}
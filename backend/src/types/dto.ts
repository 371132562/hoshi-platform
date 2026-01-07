/* 统一导出所有 DTO class 和对应的 type */

// 用户模块
export * from '../commonModules/user/user.dto';

// 角色模块
export * from '../commonModules/role/role.dto';

// 文章模块
export * from '../businessModules/article/article.dto';

// 认证模块
export * from '../commonModules/auth/auth.dto';

// 系统日志模块
export * from '../commonModules/systemLogs/systemLogs.dto';

// 上传模块
export * from '../commonModules/upload/upload.dto';

// 部门模块
export * from '../commonModules/organization/organization.dto';

/**
 * 通用类型定义
 */

/**
 * 通用分页请求参数
 */
export type CommonPageParams = {
  page?: number;
  pageSize?: number;
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

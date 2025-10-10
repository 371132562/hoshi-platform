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

/**
 * 导出格式枚举
 */
export enum ExportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
  JSON = 'json',
}

/**
 * 简单国家数据类型
 */
export type SimpleCountryData = {
  id: string;
  cnName: string;
  enName: string;
};

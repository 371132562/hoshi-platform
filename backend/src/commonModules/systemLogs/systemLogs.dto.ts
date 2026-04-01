import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 系统日志相关 DTO 类定义
 */

/**
 * 日志文件项类型
 */
export type LogFileItemResDto = {
  filename: string; // 日志文件名
};

/**
 * 日志文件响应类型
 */
export type LogFilesResDto = {
  files: LogFileItemResDto[]; // 可供选择的日志文件列表
};

/**
 * 读取日志 DTO
 */
export class ReadLogReqDto {
  @IsString()
  @IsNotEmpty({ message: '文件名不能为空' })
  filename: string; // 待读取的日志文件名

  @IsOptional()
  @Type(() => Number)
  lines?: number; // 读取的最大行数；不传时使用后端默认值
}

/**
 * 读取日志请求 DTO
 */
// export type ReadLogReqDto = ReadLog; // Removed duplicate

/**
 * 读取用户日志请求 DTO
 * 继承 ReadLogDto，复用 filename 和 lines 字段
 */
export class ReadUserLogReqDto extends ReadLogReqDto {
  @IsOptional()
  @IsString()
  username?: string; // 仅当需要筛选用户日志时使用
}

/**
 * 日志内容响应类型
 */
export type LogContentResDto = {
  content: string; // 日志文本内容
  hasMore: boolean; // 是否仍有剩余内容未返回
};

/**
 * 系统日志文件响应 DTO
 */
export type SystemLogFilesResDto = LogFilesResDto;

/**
 * 用户日志文件请求 DTO
 */
export class UserLogFilesReqDto {
  @IsOptional()
  @Type(() => Number)
  page?: number; // 页码，从 1 开始

  @IsOptional()
  @Type(() => Number)
  pageSize?: number; // 每页数量

  @IsOptional()
  @IsString()
  username?: string; // 按用户名筛选日志文件
}

/**
 * 日志用户响应 DTO
 */
export type LogUsersResDto = {
  users?: Array<{
    id: string; // 用户ID
    name: string; // 用户姓名
    username: string; // 登录账号
  }>;
  list?: Array<{
    username: string; // 登录账号
    name: string; // 用户姓名
  }>;
};

/**
 * 日志行项类型
 */
export type LogLineItemResDto = {
  ts: string; // 日志时间戳文本
  message: string; // 日志消息内容
  level?: string; // 日志级别
};

/**
 * 日志文件级别类型
 */
export type LogFileLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * 系统日志文件项类型
 */
export type SystemLogFileItemResDto = LogFileItemResDto;

/**
 * 用户日志项类型
 */
export type UserLogItemResDto = {
  id: string; // 日志主键ID
  username: string; // 操作用户账号
  name: string; // 操作用户姓名
  action: string; // 操作动作类型
  details: string; // 操作详情
  ip: string; // 请求来源 IP
  userAgent: string; // 请求终端标识
  createTime: Date; // 日志创建时间
};

/**
 * 用户日志响应类型
 */
export type UserLogsResDto = {
  logs: UserLogItemResDto[]; // 当前页日志列表
  total: number; // 总记录数
  page: number; // 当前页码
  pageSize: number; // 当前分页大小
};

/**
 * 用户日志列表 DTO
 */
export class UserLogsListReqDto {
  @IsOptional()
  @Type(() => Number)
  page?: number; // 页码，从 1 开始

  @IsOptional()
  @Type(() => Number)
  pageSize?: number; // 每页数量

  @IsOptional()
  @IsString()
  username?: string; // 按用户名筛选

  @IsOptional()
  @IsString()
  action?: string; // 按操作类型筛选

  @IsOptional()
  @IsString()
  startDate?: string; // 查询开始日期

  @IsOptional()
  @IsString()
  endDate?: string; // 查询结束日期
}

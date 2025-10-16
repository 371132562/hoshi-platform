import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 系统日志相关 DTO 类定义
 */

/**
 * 日志文件项类型
 */
export type LogFileItem = {
  filename: string;
};

/**
 * 日志文件响应类型
 */
export type LogFilesResponse = {
  files: LogFileItem[];
};

/**
 * 读取日志 DTO
 */
export class ReadLogDto {
  @IsString()
  @IsNotEmpty({ message: '文件名不能为空' })
  filename: string;

  @IsOptional()
  @Type(() => Number)
  lines?: number;
}
export type ReadLog = InstanceType<typeof ReadLogDto>;

/**
 * 读取日志请求 DTO
 */
export type ReadLogReqDto = ReadLog;

/**
 * 读取用户日志请求 DTO
 */
export class ReadUserLogReqDto {
  @IsString()
  @IsNotEmpty({ message: '文件名不能为空' })
  filename: string;

  @IsOptional()
  @Type(() => Number)
  lines?: number;

  @IsOptional()
  @IsString()
  userId?: string;
}
export type ReadUserLogReq = InstanceType<typeof ReadUserLogReqDto>;

/**
 * 日志内容响应类型
 */
export type LogContentResponse = {
  content: string;
  hasMore: boolean;
};

/**
 * 系统日志文件响应 DTO
 */
export type SystemLogFilesResDto = LogFilesResponse;

/**
 * 用户日志文件请求 DTO
 */
export class UserLogFilesReqDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  userId?: string;
}
export type UserLogFilesReq = InstanceType<typeof UserLogFilesReqDto>;

/**
 * 日志用户响应 DTO
 */
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

/**
 * 日志行项类型
 */
export type LogLineItem = {
  ts: string;
  message: string;
  level?: string;
};

/**
 * 日志文件级别类型
 */
export type LogFileLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * 系统日志文件项类型
 */
export type SystemLogFileItem = LogFileItem;

/**
 * 用户日志项类型
 */
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

/**
 * 用户日志响应类型
 */
export type UserLogsResponse = {
  logs: UserLogItem[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * 用户日志列表 DTO
 */
export class UserLogsListDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
export type UserLogsList = InstanceType<typeof UserLogsListDto>;

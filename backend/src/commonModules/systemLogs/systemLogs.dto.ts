import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 系统日志相关 DTO 类定义
 */

/**
 * 日志文件项类型
 */
export type LogFileItemRes = {
  filename: string;
};

/**
 * 日志文件响应类型
 */
export type LogFilesResDto = {
  files: LogFileItemRes[];
};

/**
 * 读取日志 DTO
 */
export class ReadLogReqDto {
  @IsString()
  @IsNotEmpty({ message: '文件名不能为空' })
  filename: string;

  @IsOptional()
  @Type(() => Number)
  lines?: number;
}
export type ReadLogReq = InstanceType<typeof ReadLogReqDto>;

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
  username?: string;
}
export type ReadUserLogReq = InstanceType<typeof ReadUserLogReqDto>;

/**
 * 日志内容响应类型
 */
export type LogContentResDto = {
  content: string;
  hasMore: boolean;
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
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  username?: string;
}
export type UserLogFilesReq = InstanceType<typeof UserLogFilesReqDto>;

/**
 * 日志用户响应 DTO
 */
export type LogUsersResDto = {
  users?: Array<{
    id: string;
    name: string;
    username: string;
  }>;
  list?: Array<{
    username: string;
    name: string;
  }>;
};

/**
 * 日志行项类型
 */
export type LogLineItemRes = {
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
export type SystemLogFileItemRes = LogFileItemRes;

/**
 * 用户日志项类型
 */
export type UserLogItemRes = {
  id: string;
  username: string;
  name: string;
  action: string;
  details: string;
  ip: string;
  userAgent: string;
  createTime: Date;
};

/**
 * 用户日志响应类型
 */
export type UserLogsResDto = {
  logs: UserLogItemRes[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * 用户日志列表 DTO
 */
export class UserLogsListReqDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  username?: string;

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
export type UserLogsListReq = InstanceType<typeof UserLogsListReqDto>;

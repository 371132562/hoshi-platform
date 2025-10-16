import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import {
  LogLineItem,
  LogUsersResDto,
  ReadLogReqDto,
  ReadUserLogReqDto,
  SystemLogFilesResDto,
  UserLogFilesReqDto,
} from './systemLogs.dto';
import { SystemLogsService } from './systemLogs.service';

// 系统日志控制器：提供日志文件列表、读取、用户搜索等接口
@Controller('system/logs')
@UseGuards(ThrottlerGuard) // 启用限流守卫
export class SystemLogsController {
  constructor(private readonly service: SystemLogsService) {}

  // 列出系统日志文件（限流：每分钟最多30次）
  @Post('files')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async listSystemFiles(): Promise<SystemLogFilesResDto> {
    return this.service.listSystemFiles();
  }

  // 列出用户日志文件（限流：每分钟最多30次）
  @Post('user/files')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async listUserFiles(
    @Body() userLogFilesReqDto: UserLogFilesReqDto,
  ): Promise<SystemLogFilesResDto> {
    return this.service.listUserFiles(userLogFilesReqDto);
  }

  // 读取系统日志内容（限流：每分钟最多20次，防止频繁读取大文件）
  @Post('read')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async readSystemLog(
    @Body() readLogReqDto: ReadLogReqDto,
  ): Promise<LogLineItem[]> {
    return this.service.readSystemLog(readLogReqDto);
  }

  // 读取用户日志内容（限流：每分钟最多20次，防止频繁读取大文件）
  @Post('user/read')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async readUserLog(
    @Body() readUserLogReqDto: ReadUserLogReqDto,
  ): Promise<LogLineItem[]> {
    return this.service.readUserLog(readUserLogReqDto);
  }

  // 列出日志用户（限流：每分钟最多30次）
  @Post('user/list')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async listLogUsers(): Promise<LogUsersResDto> {
    const result = await this.service.listLogUsers();
    return result;
  }
}

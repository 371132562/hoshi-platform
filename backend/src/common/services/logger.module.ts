import { Global, Module } from '@nestjs/common';

import { WinstonLoggerService } from './winston-logger.service';

/**
 * 全局日志模块
 * 用途：提供全局可用的日志服务
 * 使用@Global()装饰器，使得WinstonLoggerService在整个应用中可用
 */
@Global()
@Module({
  providers: [WinstonLoggerService],
  exports: [WinstonLoggerService],
})
export class LoggerModule {}

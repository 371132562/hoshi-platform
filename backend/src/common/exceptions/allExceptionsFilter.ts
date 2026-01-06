import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ErrorCode } from '../../types/response';
import { WinstonLoggerService } from '../services/winston-logger.service';

/**
 * 业务异常（BusinessException）
 * 用途：在业务逻辑中主动抛出，交由全局异常过滤器统一转换为标准响应结构
 */
export class BusinessException extends HttpException {
  constructor(
    readonly code: ErrorCode = ErrorCode.BUSINESS_FAILED,
    message?: string,
    readonly detail: any = null,
  ) {
    // 强制 HTTP 状态码为 200，便于前端统一处理
    super(message || '业务处理失败', HttpStatus.OK);
  }
}

/**
 * 全局异常过滤器（AllExceptionsFilter）
 * 用途：捕获系统内抛出的所有异常，并统一转换为 { code, msg, data } 的响应结构
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: WinstonLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let code: ErrorCode = ErrorCode.UNKNOWN_ERROR;
    let msg = '未知错误';
    let data: any = null;

    if (exception instanceof BusinessException) {
      // 1. 自定义业务异常
      code = exception.code;
      msg = exception.message;

      // 智能处理详情：如果传入的是原始 Error 对象，提取其关键信息
      if (exception.detail instanceof Error) {
        data = {
          message: exception.detail.message,
          ...(process.env.NODE_ENV !== 'production'
            ? { stack: exception.detail.stack }
            : {}),
        };
      } else {
        data = exception.detail;
      }
    } else if (exception instanceof HttpException) {
      // 2. NestJS 内置 HTTP 异常（包含参数校验、限流、404 等）
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;

      // 映射 HTTP 状态码到业务错误码
      const statusMap: Record<number, ErrorCode> = {
        [HttpStatus.BAD_REQUEST]: ErrorCode.INVALID_INPUT,
        [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
        [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
        [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
        [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.THROTTLE_ERROR,
      };
      code = statusMap[status] || ErrorCode.SYSTEM_ERROR;

      // 提取错误消息：优先使用 response 中的 message，如果是数组（校验错误）则取第一个或拼接
      const responseMessage =
        exceptionResponse?.message ||
        exceptionResponse?.msg ||
        exception.message;
      msg = Array.isArray(responseMessage)
        ? responseMessage[0]
        : responseMessage;

      // 携带原始响应数据（如果有）
      data =
        exceptionResponse?.data ||
        (Array.isArray(responseMessage) ? responseMessage : null);
    } else {
      // 3. 未知系统异常（Error 对象或其它）
      code = ErrorCode.UNKNOWN_ERROR;
      msg = (exception as Error)?.message || '服务器内部错误';

      // 开发环境下返回堆栈信息便于调试
      if (process.env.NODE_ENV !== 'production') {
        data = {
          message: (exception as Error)?.message,
          stack: (exception as Error)?.stack,
        };
      }
    }

    // 记录错误日志
    const logMessage = `【${request.method}】${request.url} - ${code} - ${msg}`;
    this.logger.error(logMessage, (exception as Error)?.stack);

    // 统一返回 200 状态码
    response.status(HttpStatus.OK).json({
      code,
      msg,
      data,
    });
  }
}

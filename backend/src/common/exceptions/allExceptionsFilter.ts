import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';

import { ErrorCode } from '../../types/response';
import { WinstonLoggerService } from '../services/winston-logger.service';
import { BusinessException } from './businessException';

/**
 * 全局异常过滤器（AllExceptionsFilter）
 * 用途：捕获系统内抛出的所有异常（业务异常/HTTP异常/未知异常），并统一转换为 { code, msg, data } 的响应结构
 * 上游：Controller/Service 中的任何 throw（例如 throw new BusinessException(...) 或 throw new HttpException(...)）
 * 下游：统一写回 HTTP 响应，状态码始终为 200（具体业务错误码放在 code 字段中），并输出错误日志
 */
@Catch() // 捕获所有异常
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: WinstonLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    // 上游：来自当前处理的异常对象（可能是任意类型）
    // 下游：将异常转换为标准响应并写回
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>(); // 下游：写回 HTTP 响应
    const request = ctx.getRequest<Request>(); // 上游：读取请求信息用于日志

    // 统一初始值：防止TypeScript严格模式下变量可能未赋值报错（TS2454）。所有分支可覆盖此默认值，也保证所有异常都有兼容响应。
    let code: number = ErrorCode.UNKNOWN_ERROR; // 默认未知错误码
    let msg: string = '未知错误'; // 默认消息
    let data: unknown = null; // 默认data

    if (exception instanceof BusinessException) {
      // 2xxxx 范围：自定义业务异常（上游：业务主动抛出）
      const exceptionResponse = exception.getResponse() as {
        code: ErrorCode;
        message: string;
      };
      code = exceptionResponse.code || ErrorCode.BUSINESS_FAILED;
      msg = exceptionResponse.message || '业务处理失败';
      data = (exception as Error).message || '业务处理失败';
    } else if (exception instanceof ThrottlerException) {
      // 限流异常处理
      code = ErrorCode.THROTTLE_ERROR;
      msg = '请求过于频繁，请稍后再试';
      data = '接口限流保护，请降低请求频率';
    } else if (exception instanceof BadRequestException) {
      // ValidationPipe 等抛出的参数校验异常（在 main.ts 的 exceptionFactory 中已组装 msg/data）
      const exceptionResponse = exception.getResponse() as {
        msg?: string | string[];
        data?: unknown;
      };
      code = ErrorCode.INVALID_INPUT;
      msg =
        (typeof exceptionResponse?.msg === 'string'
          ? exceptionResponse.msg
          : Array.isArray(exceptionResponse?.msg)
            ? exceptionResponse.msg[1]
            : undefined) || '请求参数错误';
      data = exceptionResponse?.data ?? null;
    } else if (exception instanceof HttpException) {
      // 处理 HttpException，但所有响应都是 200 状态码（统一由下游包装）
      const exceptionResponse = exception.getResponse() as {
        code?: number;
        message?: string | string[];
      };

      // 如果是 BusinessException 的透传（理论上不会走到这里），直接使用其错误码和消息
      if (exceptionResponse.code) {
        code = exceptionResponse.code;
        msg = (exceptionResponse.message as string) || '业务处理失败';
      } else {
        // 其他 HttpException 的处理
        const responseMessage =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : exceptionResponse.message;

        msg = Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : responseMessage || exception.message || 'HTTP请求错误';

        // 对于 ValidationPipe 抛出的错误，其 message 可能是一个数组
        if (Array.isArray(responseMessage)) {
          data = responseMessage; // 将详细验证错误放入 data
        } else {
          data = null;
        }

        // 根据异常类型设置错误码
        if (exception.getStatus() === 400) {
          code = ErrorCode.INVALID_INPUT;
          msg = '请求参数错误';
        } else if (exception.getStatus() === 404) {
          code = ErrorCode.RESOURCE_NOT_FOUND;
          msg = '请求资源不存在';
        } else {
          code = ErrorCode.SYSTEM_ERROR;
          msg = '服务器内部错误';
        }
      }
    } else {
      // 5xxxx 范围：其他未知错误（上游：可能来自第三方库/未捕获错误）
      code = ErrorCode.UNKNOWN_ERROR; // 使用定义的未知错误码
      // 按要求：未知异常时将捕捉到的所有错误信息（所有可枚举属性、message、stack）原样返回至data字段，便于前端和开发调试排查
      msg = '未知系统错误发生';
      // 1. 将所有可枚举属性深拷贝到data（兼容Error对象及任意类型异常）
      const rawException: Record<string, unknown> = {};
      if (exception && typeof exception === 'object') {
        // 获取全部自有属性（包括不可枚举的message/stack...）
        for (const key of Reflect.ownKeys(exception)) {
          rawException[String(key)] = (exception as Record<string, unknown>)[
            key as string
          ];
        }
      }
      // 2. 兜底补充Error标准字段
      rawException.message = (exception as Error)?.message || '未知错误';
      rawException.stack = (exception as Error)?.stack || '';
      data = rawException;
    }

    // 统一错误日志输出（下游：Winston -> 控制台/文件）
    const logMessage = `【${request.method}】${request.url} - ${code} - ${msg}`;
    this.logger.error(logMessage, (exception as Error).stack);

    // 统一返回 200 状态码，真正的业务错误码在 'code' 字段中（下游：前端）
    response.status(HttpStatus.OK).json({
      code,
      msg,
      data,
    });
  }
}

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 统一响应拦截器（TransformInterceptor）
 * 用途：在控制器返回数据后，对成功响应统一包装为 { code: 10000, msg: '成功', data }
 * 上游：Controller 返回的任意数据（包括文件流）
 * 下游：写回 HTTP 响应，非文件流强制 statusCode=200；文件流保持原样不包装
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 上游：请求/响应对象
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: T) => {
        // 特殊下游：如果是文件流，直接透传，不做包装
        if (data instanceof StreamableFile) {
          return data;
        }

        // 正常下游：统一包装 JSON 响应
        response.statusCode = 200; // 统一设置为 200
        return { code: 10000, msg: '成功', data };
      }),
    );
  }
}

import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

import { ErrorCode } from '../../../types/response';
import { IS_PUBLIC_KEY } from '../../common/auth/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.split(' ')[1]; // 获取 token

    // 未登录的情况下，这时前端做了路由访问的限制，直接返回 true
    if (!token) {
      return true; // 允许访问
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 对于非公开接口，必须进行JWT验证
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      // 根据错误类型返回不同的错误信息
      if (
        err &&
        typeof err === 'object' &&
        (err as { name?: string }).name === 'TokenExpiredError'
      ) {
        throw new UnauthorizedException({
          code: ErrorCode.TOKEN_EXPIRED,
          message: '认证信息已过期，请重新登录',
        });
      } else if (
        err &&
        typeof err === 'object' &&
        (err as { name?: string }).name === 'JsonWebTokenError'
      ) {
        throw new UnauthorizedException({
          code: ErrorCode.UNAUTHORIZED,
          message: '认证信息无效，请重新登录',
        });
      } else {
        throw new UnauthorizedException({
          code: ErrorCode.UNAUTHORIZED,
          message: '认证失败，请登录',
        });
      }
    }
    return user as TUser;
  }
}

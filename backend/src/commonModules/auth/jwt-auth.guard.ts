import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../../common/auth/public.decorator';
import { ErrorCode } from '../../types/response';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

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

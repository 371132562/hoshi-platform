import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { buildUserItemResDto } from '../../common/auth/user-profile.builder';
import { BusinessException } from '../../common/exceptions/allExceptionsFilter';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '../../types/response';
import { TokenPayloadResDto } from './auth.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从Authorization头中提取Bearer token
      ignoreExpiration: false, // 不忽略过期时间
      secretOrKey: 'urbanization-jwt-secret-key-2024', // JWT密钥（硬编码）
    });
  }

  /**
   * 验证JWT token并返回用户信息
   * @param payload JWT payload
   * @returns 用户信息
   */
  async validate(payload: TokenPayloadResDto) {
    try {
      // 验证用户是否仍然存在且未删除
      const user = await this.prisma.user.findFirst({
        where: {
          id: payload.userId,
          delete: 0,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
          userRoles: {
            orderBy: { createTime: 'asc' },
            include: {
              role: {
                select: {
                  id: true,
                  code: true,
                  displayName: true,
                  description: true,
                  permissionKeys: true,
                  delete: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new BusinessException(
          ErrorCode.USER_NOT_FOUND,
          '用户不存在或已被删除',
        );
      }

      // 返回用户信息，这些信息会被注入到请求对象中
      // 必须符合 UserInfo 类型定义
      const userInfo = buildUserItemResDto(
        {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          isBuiltIn: user.isBuiltIn,
          organizationId: user.organizationId ?? null,
          organization: user.organization
            ? { id: user.organization.id, name: user.organization.name }
            : null,
          phone: user.phone ?? null,
        },
        user.userRoles.map((userRole) => userRole.role),
      );

      if (userInfo.roles.length === 0) {
        throw new BusinessException(ErrorCode.FORBIDDEN, '用户未分配角色');
      }

      return {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        hasAdminRole: userInfo.hasAdminRole,
        phone: user.phone ?? null,
        organizationId: userInfo.organizationId,
        organization: userInfo.organization,
        roles: userInfo.roles,
        permissionKeys: userInfo.permissionKeys,
      };
    } catch (error) {
      // 如果是已知的BusinessException，直接抛出
      if (error instanceof BusinessException) {
        throw error;
      }
      // 其他错误统一处理
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new BusinessException(
        ErrorCode.TOKEN_EXPIRED,
        'Token验证失败：' + errorMessage,
      );
    }
  }
}

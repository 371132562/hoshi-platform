import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { buildUserItemResDto } from '../../common/auth/user-permission.util';
import { BusinessException } from '../../common/exceptions/allExceptionsFilter';
import { WinstonLoggerService } from '../../common/services/winston-logger.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '../../types/response';
import {
  ChallengeResDto,
  LoginResDto,
  LoginWithHashReqDto,
  TokenPayloadResDto,
} from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * 用户登录验证
   * @param loginDto 登录信息
   * @returns 登录响应，包含token和用户信息
   */

  /**
   * 通用挑战接口 - 获取随机盐
   */
  getChallenge(): ChallengeResDto {
    this.logger.log(`[操作] 获取挑战 - 生成随机盐`);
    try {
      const salt = CryptoUtil.generateSalt();
      // 加密随机盐后返回，提高安全性
      const encryptedSalt = CryptoUtil.encryptSalt(salt);
      return encryptedSalt;
    } catch (error) {
      this.logger.error(
        `[失败] 获取挑战 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 两步登录 - 第二步：接收前端crypto加密数据并校验
   */
  async loginWithHash(dto: LoginWithHashReqDto): Promise<LoginResDto> {
    const { username } = dto;
    this.logger.log(`[操作] 用户登录 - 用户名: ${username}`);
    try {
      const user = await this.prisma.user.findFirst({
        where: { username, delete: 0 },
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
                  allowedRoutes: true,
                  delete: true,
                },
              },
            },
          },
        },
      });
      if (!user) {
        this.logger.warn(`[验证失败] 用户登录 - 用户名 ${username} 不存在`);
        throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
      }

      // 解密前端数据，提取密码部分
      const decryptedData = CryptoUtil.decryptData(dto.encryptedData);
      const password =
        CryptoUtil.extractPasswordFromDecryptedData(decryptedData);

      // 使用bcrypt.compare验证密码
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        this.logger.warn(`[验证失败] 用户登录 - 用户名 ${username} 密码错误`);
        throw new BusinessException(ErrorCode.PASSWORD_INCORRECT, '密码错误');
      }

      const userInfo = buildUserItemResDto(
        {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          isSystem: user.isSystem,
          organizationId: user.organizationId ?? null,
          organization: user.organization
            ? { id: user.organization.id, name: user.organization.name }
            : null,
          phone: user.phone ?? null,
        },
        user.userRoles.map((userRole) => userRole.role),
      );

      if (userInfo.roles.length === 0) {
        this.logger.warn(
          `[验证失败] 用户登录 - 用户名 ${username} 未分配任何角色`,
        );
        throw new BusinessException(ErrorCode.FORBIDDEN, '用户未分配角色');
      }

      const payload: TokenPayloadResDto = {
        sub: user.id,
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
      };
      const token = this.jwtService.sign(payload);
      this.logger.log(
        `[操作] 用户登录成功 - 用户名: ${username}, 姓名: ${user.displayName}`,
      );
      return {
        token,
        user: userInfo,
      };
    } catch (error) {
      if (error instanceof BusinessException) throw error;
      this.logger.error(
        `[失败] 用户登录 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 获取用户信息
   * @param userId 用户ID
   * @returns 用户详细信息
   */
  async getUserProfile(userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
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
                  allowedRoutes: true,
                  delete: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        this.logger.warn(
          `[验证失败] 获取用户信息 - 用户ID ${userId} 不存在或已被删除`,
        );
        throw new BusinessException(
          ErrorCode.USER_NOT_FOUND,
          '用户不存在或已被删除',
        );
      }

      this.logger.log(
        `[操作] 获取用户信息 - 用户ID: ${userId}, 用户名: ${user.username}, 姓名: ${user.displayName}`,
      );

      return buildUserItemResDto(
        {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          isSystem: user.isSystem,
          organizationId: user.organizationId ?? null,
          organization: user.organization
            ? { id: user.organization.id, name: user.organization.name }
            : null,
          phone: user.phone ?? null,
        },
        user.userRoles.map((userRole) => userRole.role),
      );
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 获取用户信息 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  LoginResponseDto,
  TokenPayloadDto,
  ChallengeDto,
  ChallengeResDto,
  LoginWithHashDto,
} from '../../../types/dto';
import { BusinessException } from '../../common/exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import { CryptoUtil } from '../../common/utils/crypto.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * 用户登录验证
   * @param loginDto 登录信息
   * @returns 登录响应，包含token和用户信息
   */

  /**
   * 通用挑战接口 - 获取随机盐
   * 两步登录 - 第一步：获取随机盐
   */
  getChallenge(dto: ChallengeDto): ChallengeResDto {
    this.logger.log(`[开始] 获取挑战 - 类型: ${dto.type}`);
    try {
      const salt = CryptoUtil.generateSalt();
      // 直接返回随机盐字符串，避免前端多一层 data.salt 解构
      return salt;
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
  async loginWithHash(dto: LoginWithHashDto): Promise<LoginResponseDto> {
    const { code } = dto;
    this.logger.log(`[开始] 用户登录 - 用户编号: ${code}`);
    try {
      const user = await this.prisma.user.findFirst({
        where: { code, delete: 0 },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              allowedRoutes: true,
            },
          },
        },
      });
      if (!user) {
        this.logger.warn(`[验证失败] 用户登录 - 用户编号 ${code} 不存在`);
        throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
      }

      // 解密前端数据，提取密码部分
      const decryptedData = CryptoUtil.decryptData(dto.encryptedData);
      const password =
        CryptoUtil.extractPasswordFromDecryptedData(decryptedData);

      // 使用bcrypt.compare验证密码
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        this.logger.warn(`[验证失败] 用户登录 - 用户编号 ${code} 密码错误`);
        throw new BusinessException(ErrorCode.PASSWORD_INCORRECT, '密码错误');
      }

      const payload: TokenPayloadDto = {
        userId: user.id,
        userCode: user.code,
        userName: user.name,
        roleId: user.roleId || undefined,
        roleName: user.role?.name,
      };
      const token = this.jwtService.sign(payload);
      this.logger.log(
        `[成功] 用户登录 - 用户编号: ${code}, 姓名: ${user.name}`,
      );
      return {
        token,
        user: {
          id: user.id,
          code: user.code,
          name: user.name,
          department: user.department,
          email: user.email || undefined,
          phone: user.phone || undefined,
          roleId: user.roleId || undefined,
          role: user.role
            ? {
                id: user.role.id,
                name: user.role.name,
                description: user.role.description || undefined,
                allowedRoutes: user.role.allowedRoutes as string[],
              }
            : undefined,
        },
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
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              allowedRoutes: true,
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

      // 查询到用户后再输出更友好的开始/成功日志
      this.logger.log(
        `[开始] 获取用户信息 - 用户ID: ${userId}, 编号: ${user.code}, 姓名: ${user.name}`,
      );

      this.logger.log(
        `[成功] 获取用户信息 - 用户ID: ${userId}, 姓名: ${user.name}`,
      );

      return {
        id: user.id,
        code: user.code,
        name: user.name,
        department: user.department,
        email: user.email || undefined,
        phone: user.phone || undefined,
        roleId: user.roleId || undefined,
        role: user.role
          ? {
              id: user.role.id,
              name: user.role.name,
              description: user.role.description || undefined,
              allowedRoutes: user.role.allowedRoutes as string[],
            }
          : undefined,
        createTime: user.createTime,
        updateTime: user.updateTime,
      };
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

import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../prisma/prisma.service';
import { ErrorCode } from '../../../types/response';
import { BusinessException } from '../../common/exceptions/businessException';
import { WinstonLoggerService } from '../../common/services/winston-logger.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import {
  CreateUserEncryptedDto,
  DeleteUserDto,
  ResetUserPasswordEncryptedDto,
  UpdateUserDto,
  UserListResDto,
} from './user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * 获取用户列表，包含角色名
   */
  async getUserList(): Promise<UserListResDto> {
    this.logger.log('[操作] 获取用户列表');

    try {
      const users = await this.prisma.user.findMany({
        where: { delete: 0 },
        include: { role: true },
        orderBy: { createTime: 'asc' },
      });

      this.logger.log(`[操作] 获取用户列表 - 共 ${users.length} 个用户`);

      const userList = users.map((user) => ({
        id: user.id,
        code: user.code,
        name: user.name,
        department: user.department,
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: user.role ? { name: user.role.name } : null,
      }));

      return userList;
    } catch (error) {
      this.logger.error(
        `[失败] 获取用户列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 创建用户（加密）
   */
  async createUserEncrypted(dto: CreateUserEncryptedDto) {
    this.logger.log(`[操作] 创建用户 - 编号: ${dto.code}, 姓名: ${dto.name}`);

    try {
      // 解密前端数据，提取密码部分
      const decryptedData = CryptoUtil.decryptData(dto.encryptedPassword);
      const password =
        CryptoUtil.extractPasswordFromDecryptedData(decryptedData);

      // 使用bcrypt对明文密码进行哈希
      const hashedPassword = await bcrypt.hash(password, 10);

      await this.prisma.user.create({
        data: {
          code: dto.code,
          name: dto.name,
          department: dto.department,
          email: dto.email,
          phone: dto.phone,
          password: hashedPassword,
          roleId: dto.roleId,
        },
      });

      this.logger.log(
        `[操作] 创建用户成功 - 编号: ${dto.code}, 姓名: ${dto.name}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 创建用户 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 编辑用户
   */
  async updateUser(user: User, dto: UpdateUserDto) {
    try {
      this.logger.log(
        `[操作] 编辑用户 - ID: ${user.id}, 编号: ${user.code}, 姓名: ${user.name}`,
      );

      if (user.code === '88888888') {
        this.logger.warn(
          `[验证失败] 编辑用户 - 超管用户 ${user.code} 不可编辑`,
        );
        throw new BusinessException(
          ErrorCode.USER_CANNOT_EDIT_ADMIN,
          '超管用户不可编辑',
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: dto.name ?? user.name,
          department: dto.department ?? user.department,
          email: dto.email ?? user.email,
          phone: dto.phone ?? user.phone,
          roleId: dto.roleId ?? user.roleId,
        },
      });

      this.logger.log(
        `[操作] 编辑用户成功 - ID: ${user.id}, 编号: ${user.code}, 姓名: ${dto.name || user.name}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 编辑用户 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 删除用户（软删除）
   */
  async deleteUser(user: User) {
    try {
      this.logger.log(
        `[操作] 删除用户 - ID: ${user.id}, 编号: ${user.code}, 姓名: ${user.name}`,
      );

      if (user.code === '88888888') {
        this.logger.warn(
          `[验证失败] 删除用户 - 超管用户 ${user.code} 不可删除`,
        );
        throw new BusinessException(
          ErrorCode.USER_CANNOT_DELETE_ADMIN,
          '超管用户不可删除',
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { delete: 1 },
      });

      this.logger.log(
        `[操作] 删除用户成功 - ID: ${user.id}, 编号: ${user.code}, 姓名: ${user.name}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 删除用户 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 重置用户密码（加密）
   */
  async resetUserPasswordEncrypted(dto: ResetUserPasswordEncryptedDto) {
    try {
      // 先获取用户信息，便于输出更友好的日志
      const user = await this.prisma.user.findUnique({ where: { id: dto.id } });
      this.logger.log(
        user
          ? `[操作] 重置用户密码 - ID: ${dto.id}, 编号: ${user.code}, 姓名: ${user.name}`
          : `[操作] 重置用户密码 - ID: ${dto.id}`,
      );
      if (!user || user.delete !== 0) {
        this.logger.warn(`[验证失败] 重置用户密码 - 用户ID ${dto.id} 不存在`);
        throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
      }

      // 解密前端数据，提取密码部分
      const decryptedData = CryptoUtil.decryptData(dto.encryptedNewPassword);
      const newPassword =
        CryptoUtil.extractPasswordFromDecryptedData(decryptedData);

      // 使用bcrypt对明文密码进行哈希
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.prisma.user.update({
        where: { id: dto.id },
        data: { password: hashedPassword },
      });

      this.logger.log(
        `[操作] 重置用户密码成功 - ID: ${dto.id}, 编号: ${user.code}, 姓名: ${user.name}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 重置用户密码 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}

import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/generated/client';
import * as bcrypt from 'bcrypt';

import { BusinessException } from '../../common/exceptions/allExceptionsFilter';
import { WinstonLoggerService } from '../../common/services/winston-logger.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '../../types/response';
import {
  CreateUserEncryptedReqDto,
  ResetUserPasswordEncryptedReqDto,
  UpdateUserReqDto,
  UserListReqDto,
  UserListResDto,
} from './user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * 获取用户列表，支持分页和筛选
   */
  async getUserList(query: UserListReqDto): Promise<UserListResDto> {
    const { page = 1, pageSize = 10, name, roleId } = query;
    this.logger.log(
      `[操作] 获取用户列表 - 页码: ${page}, 每页: ${pageSize}, 姓名: ${name || '无'}, 角色ID: ${roleId || '无'}`,
    );

    try {
      // 构建筛选条件
      const where: Record<string, unknown> = { delete: 0 };
      if (name) {
        where.name = { contains: name };
      }
      if (roleId) {
        where.roleId = roleId;
      }

      // 分页计算
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      // 并行查询列表和总数
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          include: { role: true },
          orderBy: { createTime: 'asc' },
          skip,
          take,
        }),
        this.prisma.user.count({ where }),
      ]);

      this.logger.log(
        `[操作] 获取用户列表成功 - 本页 ${users.length} 条，共 ${total} 条`,
      );

      const list = users.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        organizationId: user.organizationId ?? null,
        phone: user.phone ?? null,
        role: { name: user.role!.name },
      }));

      return { list, total, page, pageSize };
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
  async createUserEncrypted(dto: CreateUserEncryptedReqDto) {
    this.logger.log(
      `[操作] 创建用户 - 用户名: ${dto.username}, 姓名: ${dto.name}`,
    );

    try {
      // 解密前端数据，提取密码部分
      const decryptedData = CryptoUtil.decryptData(dto.encryptedPassword);
      const password =
        CryptoUtil.extractPasswordFromDecryptedData(decryptedData);

      // 使用bcrypt对明文密码进行哈希
      const hashedPassword = await bcrypt.hash(password, 10);

      await this.prisma.user.create({
        data: {
          username: dto.username,
          name: dto.name,
          phone: dto.phone,
          password: hashedPassword,
          roleId: dto.roleId,
        },
      });

      this.logger.log(
        `[操作] 创建用户成功 - 用户名: ${dto.username}, 姓名: ${dto.name}`,
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
  async updateUser(user: User, dto: UpdateUserReqDto) {
    try {
      this.logger.log(
        `[操作] 编辑用户 - ID: ${user.id}, 用户名: ${user.username}, 姓名: ${user.name}`,
      );

      if (user.username === 'admin') {
        this.logger.warn(
          `[验证失败] 编辑用户 - 超管用户 ${user.username} 不可编辑`,
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
          phone: dto.phone ?? user.phone,
          roleId: dto.roleId ?? user.roleId,
        },
      });

      this.logger.log(
        `[操作] 编辑用户成功 - ID: ${user.id}, 用户名: ${user.username}, 姓名: ${dto.name || user.name}`,
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
        `[操作] 删除用户 - ID: ${user.id}, 用户名: ${user.username}, 姓名: ${user.name}`,
      );

      if (user.username === 'admin') {
        this.logger.warn(
          `[验证失败] 删除用户 - 超管用户 ${user.username} 不可删除`,
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
        `[操作] 删除用户成功 - ID: ${user.id}, 用户名: ${user.username}, 姓名: ${user.name}`,
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
  async resetUserPasswordEncrypted(dto: ResetUserPasswordEncryptedReqDto) {
    try {
      // 先获取用户信息，便于输出更友好的日志
      const user = await this.prisma.user.findUnique({ where: { id: dto.id } });
      this.logger.log(
        user
          ? `[操作] 重置用户密码 - ID: ${dto.id}, 用户名: ${user.username}, 姓名: ${user.name}`
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
        `[操作] 重置用户密码成功 - ID: ${dto.id}, 用户名: ${user.username}, 姓名: ${user.name}`,
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

import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/generated/client';
import { Prisma } from '@prisma/generated/client';
import * as bcrypt from 'bcryptjs';

import { buildUserItemResDto } from '../../common/auth/user-profile.builder';
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

  /** 去重并清理角色ID列表中的空白值。 */
  private normalizeRoleIds(roleIds: string[]): string[] {
    return Array.from(
      new Set(roleIds.filter((roleId) => roleId.trim().length > 0)),
    );
  }

  /** 校验角色ID是否有效，并返回去重后的角色ID列表。 */
  private async validateRoleIds(roleIds: string[]): Promise<string[]> {
    const normalizedRoleIds = this.normalizeRoleIds(roleIds);

    if (normalizedRoleIds.length === 0) {
      throw new BusinessException(ErrorCode.INVALID_INPUT, '至少选择一个角色');
    }

    const roles = await this.prisma.role.findMany({
      where: {
        id: { in: normalizedRoleIds },
        delete: 0,
      },
      select: { id: true },
    });

    if (roles.length !== normalizedRoleIds.length) {
      throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, '存在无效角色');
    }

    return normalizedRoleIds;
  }

  /** 在事务内重建用户与角色的绑定关系。 */
  private async replaceUserRoles(
    tx: Prisma.TransactionClient,
    userId: string,
    roleIds: string[],
  ) {
    await tx.userRole.deleteMany({ where: { userId } });
    await tx.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
    });
  }

  /**
   * 获取用户列表，支持分页和筛选
   */
  async getUserList(query: UserListReqDto): Promise<UserListResDto> {
    const { page = 1, pageSize = 10, displayName, roleId } = query;
    this.logger.log(
      `[操作] 获取用户列表 - 页码: ${page}, 每页: ${pageSize}, 姓名: ${displayName || '无'}, 角色ID: ${roleId || '无'}`,
    );

    try {
      // 构建筛选条件
      const where: Prisma.UserWhereInput = { delete: 0 };
      if (displayName) {
        where.displayName = { contains: displayName };
      }
      if (roleId) {
        where.userRoles = { some: { roleId } };
      }

      // 分页计算
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      // 并行查询列表和总数
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
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
          orderBy: { createTime: 'asc' },
          skip,
          take,
        }),
        this.prisma.user.count({ where }),
      ]);

      this.logger.log(
        `[操作] 获取用户列表成功 - 本页 ${users.length} 条，共 ${total} 条`,
      );

      const list = users.map((user) =>
        buildUserItemResDto(
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
        ),
      );

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
      `[操作] 创建用户 - 用户名: ${dto.username}, 姓名: ${dto.displayName}`,
    );

    try {
      const validatedRoleIds = await this.validateRoleIds(dto.roleIds);

      // 解密前端数据，提取密码部分
      const decryptedData = CryptoUtil.decryptData(dto.encryptedPassword);
      const password =
        CryptoUtil.extractPasswordFromDecryptedData(decryptedData);

      // 使用bcrypt对明文密码进行哈希
      const hashedPassword = await bcrypt.hash(password, 10);

      await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: dto.username,
            displayName: dto.displayName,
            phone: dto.phone,
            password: hashedPassword,
            organizationId: dto.organizationId,
          },
        });

        await this.replaceUserRoles(tx, user.id, validatedRoleIds);
      });

      this.logger.log(
        `[操作] 创建用户成功 - 用户名: ${dto.username}, 姓名: ${dto.displayName}`,
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
        `[操作] 编辑用户 - ID: ${user.id}, 用户名: ${user.username}, 姓名: ${user.displayName}`,
      );

      if (user.isBuiltIn) {
        this.logger.warn(
          `[验证失败] 编辑用户 - 系统用户 ${user.username} 不可编辑`,
        );
        throw new BusinessException(
          ErrorCode.USER_CANNOT_EDIT_ADMIN,
          '系统内置用户不可编辑',
        );
      }

      const validatedRoleIds = dto.roleIds
        ? await this.validateRoleIds(dto.roleIds)
        : null;

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            displayName: dto.displayName ?? user.displayName,
            phone: dto.phone ?? user.phone,
            organizationId:
              dto.organizationId !== undefined
                ? dto.organizationId
                : user.organizationId,
          },
        });

        if (validatedRoleIds) {
          await this.replaceUserRoles(tx, user.id, validatedRoleIds);
        }
      });

      this.logger.log(
        `[操作] 编辑用户成功 - ID: ${user.id}, 用户名: ${user.username}, 姓名: ${dto.displayName || user.displayName}`,
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
        `[操作] 删除用户 - ID: ${user.id}, 用户名: ${user.username}, 姓名: ${user.displayName}`,
      );

      if (user.isBuiltIn) {
        this.logger.warn(
          `[验证失败] 删除用户 - 系统用户 ${user.username} 不可删除`,
        );
        throw new BusinessException(
          ErrorCode.USER_CANNOT_DELETE_ADMIN,
          '系统内置用户不可删除',
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { delete: 1 },
      });

      this.logger.log(
        `[操作] 删除用户成功 - ID: ${user.id}, 用户名: ${user.username}, 姓名: ${user.displayName}`,
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
          ? `[操作] 重置用户密码 - ID: ${dto.id}, 用户名: ${user.username}, 姓名: ${user.displayName}`
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
        `[操作] 重置用户密码成功 - ID: ${dto.id}, 用户名: ${user.username}, 姓名: ${user.displayName}`,
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

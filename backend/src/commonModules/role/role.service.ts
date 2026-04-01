import { Injectable } from '@nestjs/common';
import type { Role } from '@prisma/generated/client';
import { Prisma } from '@prisma/generated/client';

import { BusinessException } from '../../common/exceptions/allExceptionsFilter';
import { WinstonLoggerService } from '../../common/services/winston-logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '../../types/response';
import {
  AssignRolePermissionKeysReqDto,
  CreateRoleReqDto,
  RoleListResDto,
  UpdateRoleReqDto,
} from './role.dto';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * 获取角色列表，包含用户数量
   */
  async getRoleList(): Promise<RoleListResDto> {
    this.logger.log('[操作] 获取角色列表');

    try {
      const roles = await this.prisma.role.findMany({
        where: { delete: 0 },
        include: {
          userRoles: {
            where: { user: { delete: 0 } },
            select: { userId: true },
          },
        },
        orderBy: { createTime: 'asc' },
      });

      this.logger.log(`[操作] 获取角色列表 - 共 ${roles.length} 个角色`);

      // 1. 将 JSON 权限字段规范化为字符串数组，并补齐用户数等派生信息。
      const roleList = roles.map((role) => ({
        id: role.id,
        code: role.code,
        displayName: role.displayName,
        isSystem: role.isSystem,
        description: role.description ?? null,
        permissionKeys: Array.isArray(role.permissionKeys)
          ? (role.permissionKeys as unknown[]).filter(
              (r): r is string => typeof r === 'string',
            )
          : [], // 只保留字符串
        userCount: role.userRoles.length,
      }));

      return roleList;
    } catch (error) {
      this.logger.error(
        `[失败] 获取角色列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 创建角色
   */
  async createRole(dto: CreateRoleReqDto) {
    this.logger.log(`[操作] 创建角色 - 名称: ${dto.displayName} (${dto.code})`);

    try {
      // 角色创建直接落稳定权限 key，避免再做 path 级兼容转换。
      await this.prisma.role.create({
        data: {
          code: dto.code,
          displayName: dto.displayName,
          description: dto.description,
          permissionKeys: dto.permissionKeys,
        },
      });

      this.logger.log(
        `[操作] 创建角色成功 - 名称: ${dto.displayName} (${dto.code})`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 创建角色 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 编辑角色
   */
  async updateRole(role: Role, dto: UpdateRoleReqDto) {
    try {
      this.logger.log(
        `[操作] 编辑角色 - ID: ${role.id}, 名称: ${role.displayName}`,
      );

      if (role.isSystem) {
        this.logger.warn(
          `[验证失败] 编辑角色 - 系统角色 ${role.displayName} (${role.code}) 不可编辑`,
        );
        throw new BusinessException(
          ErrorCode.ROLE_CANNOT_EDIT_ADMIN,
          '系统内置角色不可编辑',
        );
      }

      // 1. displayName 变化时单独做重名校验，避免和其他角色混淆。
      if (dto.displayName && dto.displayName !== role.displayName) {
        const exist = await this.prisma.role.findFirst({
          where: { displayName: dto.displayName, delete: 0 },
        });
        if (exist) {
          this.logger.warn(
            `[验证失败] 编辑角色 - 角色显示名称 ${dto.displayName} 已存在`,
          );
          throw new BusinessException(
            ErrorCode.ROLE_NAME_EXIST,
            '角色显示名称已存在',
          );
        }
      }

      // 2. 统一更新展示信息与权限 key；未传的字段保持原值。
      await this.prisma.role.update({
        where: { id: role.id },
        data: {
          displayName: dto.displayName ?? role.displayName,
          description: dto.description ?? role.description,
          permissionKeys:
            dto.permissionKeys !== undefined
              ? (dto.permissionKeys as unknown as Prisma.InputJsonValue)
              : (role.permissionKeys as unknown as Prisma.InputJsonValue),
        },
      });

      this.logger.log(
        `[操作] 编辑角色成功 - ID: ${role.id}, 名称: ${dto.displayName || role.displayName}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 编辑角色 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 删除角色（软删除）
   */
  async deleteRole(role: Role) {
    try {
      this.logger.log(
        `[操作] 删除角色 - ID: ${role.id}, 名称: ${role.displayName}`,
      );

      if (role.isSystem) {
        this.logger.warn(
          `[验证失败] 删除角色 - 系统角色 ${role.displayName} (${role.code}) 不可删除`,
        );
        throw new BusinessException(
          ErrorCode.ROLE_CANNOT_DELETE_ADMIN,
          '系统内置角色不可删除',
        );
      }

      // 1. 仍被用户使用的角色不允许删除，避免产生悬空授权关系。
      const userCount = await this.prisma.userRole.count({
        where: { roleId: role.id, user: { delete: 0 } },
      });
      if (userCount > 0) {
        this.logger.warn(
          `[验证失败] 删除角色 - 角色 ${role.displayName} 有 ${userCount} 个用户关联，无法删除`,
        );
        throw new BusinessException(
          ErrorCode.DATA_STILL_REFERENCED,
          '有用户关联该角色，无法删除',
        );
      }

      await this.prisma.role.update({
        where: { id: role.id },
        data: { delete: 1 },
      });

      this.logger.log(
        `[操作] 删除角色成功 - ID: ${role.id}, 名称: ${role.displayName}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 删除角色 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 分配角色菜单权限
   */
  async assignRolePermissionKeys(dto: AssignRolePermissionKeysReqDto) {
    try {
      // 1. 先校验角色是否存在且仍可编辑。
      const role = await this.prisma.role.findUnique({ where: { id: dto.id } });
      this.logger.log(
        role
          ? `[操作] 分配角色菜单权限 - 角色ID: ${dto.id}, 名称: ${role.displayName}`
          : `[操作] 分配角色菜单权限 - 角色ID: ${dto.id}`,
      );
      if (!role || role.delete !== 0) {
        this.logger.warn(
          `[验证失败] 分配角色菜单权限 - 角色ID ${dto.id} 不存在`,
        );
        throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, '角色不存在');
      }

      if (role.isSystem) {
        this.logger.warn(
          `[验证失败] 分配角色菜单权限 - 系统角色 ${role.displayName} 不可编辑`,
        );
        throw new BusinessException(
          ErrorCode.ROLE_CANNOT_EDIT_ADMIN,
          '系统内置角色不可编辑',
        );
      }

      // 2. 仅保留字符串形式的权限 key，避免无效 JSON 值写回数据库。
      const filteredPermissionKeys = (dto.permissionKeys as unknown[]).filter(
        (permissionKey): permissionKey is string =>
          typeof permissionKey === 'string',
      );

      // 3. 一次性覆盖角色权限集合，保持权限真值只有一份。
      await this.prisma.role.update({
        where: { id: dto.id },
        data: {
          permissionKeys: filteredPermissionKeys,
        },
      });

      this.logger.log(
        `[操作] 分配角色菜单权限成功 - 角色ID: ${dto.id}, 名称: ${role.displayName}, 权限数量: ${filteredPermissionKeys.length}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 分配角色菜单权限 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}

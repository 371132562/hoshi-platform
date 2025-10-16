import { Injectable, PipeTransform } from '@nestjs/common';
import type { Role } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { ErrorCode } from '../../../types/response';
import { BusinessException } from '../../common/exceptions/businessException';

/**
 * 角色名唯一性验证Pipe
 * 用途：验证角色名是否已存在，如果存在则抛出异常
 * 使用场景：创建/更新角色时的名称验证
 */
@Injectable()
export class RoleNameExistsValidationPipe implements PipeTransform {
  constructor(private readonly prisma: PrismaService) {}

  async transform(value: string): Promise<string> {
    if (!value) {
      return value;
    }

    // 系统保留角色名检查
    if (value === 'admin') {
      throw new BusinessException(
        ErrorCode.ROLE_NAME_EXIST,
        'admin为系统保留角色名',
      );
    }

    const exist = await this.prisma.role.findFirst({
      where: { name: value, delete: 0 },
    });

    if (exist) {
      throw new BusinessException(ErrorCode.ROLE_NAME_EXIST, '角色名已存在');
    }

    return value;
  }
}

/**
 * 角色名更新验证Pipe
 * 用途：验证更新角色时名称是否冲突，如果冲突则抛出异常
 * 使用场景：更新角色时的名称验证
 */
@Injectable()
export class RoleNameUpdateValidationPipe implements PipeTransform {
  constructor(private readonly prisma: PrismaService) {}

  async transform(value: { name: string; id: string }): Promise<string> {
    const { name, id } = value;

    if (!name || !id) {
      return name;
    }

    // 系统保留角色名检查
    if (name === 'admin') {
      throw new BusinessException(
        ErrorCode.ROLE_NAME_EXIST,
        'admin为系统保留角色名',
      );
    }

    // 获取当前角色信息
    const currentRole = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!currentRole) {
      throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, '角色不存在');
    }

    // 如果名称没有改变，不需要验证
    if (name === currentRole.name) {
      return name;
    }

    // 检查新名称是否已存在
    const exist = await this.prisma.role.findFirst({
      where: { name, delete: 0 },
    });

    if (exist) {
      throw new BusinessException(ErrorCode.ROLE_NAME_EXIST, '角色名已存在');
    }

    return name;
  }
}

/**
 * 根据ID加载角色实体（存在性校验 + 注入实体）
 */
@Injectable()
export class RoleByIdPipe implements PipeTransform<string, Promise<Role>> {
  constructor(private readonly prisma: PrismaService) {}

  async transform(value: string): Promise<Role> {
    const role = await this.prisma.role.findFirst({
      where: { id: value, delete: 0 },
    });
    if (!role) {
      throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, '角色不存在');
    }
    return role;
  }
}

import { Injectable, PipeTransform } from '@nestjs/common';
import type { User } from '@prisma/generated/client';

import { BusinessException } from '../../common/exceptions/businessException';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '../../types/response';

/**
 * 用户名唯一性验证Pipe
 * 用途：验证用户名是否已存在，如果存在则抛出异常
 * 使用场景：创建用户时的用户名验证
 */
@Injectable()
export class UserCodeExistsValidationPipe implements PipeTransform {
  constructor(private readonly prisma: PrismaService) {}

  async transform(value: string): Promise<string> {
    if (!value) {
      return value;
    }

    // 系统保留用户名检查
    if (value === 'admin') {
      throw new BusinessException(
        ErrorCode.USER_CODE_EXIST,
        '超管用户名不可用',
      );
    }

    const exist = await this.prisma.user.findFirst({
      where: { username: value, delete: 0 },
    });

    if (exist) {
      throw new BusinessException(ErrorCode.USER_CODE_EXIST, '用户名已存在');
    }

    return value;
  }
}

/**
 * 根据ID加载用户实体（存在性校验 + 注入实体）
 */
@Injectable()
export class UserByIdPipe implements PipeTransform<string, Promise<User>> {
  constructor(private readonly prisma: PrismaService) {}

  async transform(value: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id: value, delete: 0 },
    });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }
    return user;
  }
}

import { Injectable, PipeTransform } from '@nestjs/common';
import type { User } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { ErrorCode } from '../../../types/response';
import { BusinessException } from '../../common/exceptions/businessException';

/**
 * 用户编号唯一性验证Pipe
 * 用途：验证用户编号是否已存在，如果存在则抛出异常
 * 使用场景：创建用户时的编号验证
 */
@Injectable()
export class UserCodeExistsValidationPipe implements PipeTransform {
  constructor(private readonly prisma: PrismaService) {}

  async transform(value: string): Promise<string> {
    if (!value) {
      return value;
    }

    // 系统保留编号检查
    if (value === 'admin') {
      throw new BusinessException(ErrorCode.USER_CODE_EXIST, '超管编号不可用');
    }

    const exist = await this.prisma.user.findFirst({
      where: { code: value, delete: 0 },
    });

    if (exist) {
      throw new BusinessException(ErrorCode.USER_CODE_EXIST, '用户编号已存在');
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

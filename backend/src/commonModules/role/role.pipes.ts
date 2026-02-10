import { PipeTransform } from '@nestjs/common';
import type { Role } from '@prisma/generated/client';

import { BusinessException } from '../../common/exceptions/allExceptionsFilter';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '../../types/response';
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

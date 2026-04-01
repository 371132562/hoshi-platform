import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { UserRoleResDto } from '../../commonModules/user/user.dto';

type RequestWithUser = {
  user?: UserInfo;
};

export type UserInfo = {
  userId: string;
  username: string; // account name (login)
  displayName: string; // localized display name
  hasAdminRole: boolean; // 是否具备 admin 角色能力
  phone?: string;
  organizationId?: string | null;
  organization?: { id: string; name: string } | null;
  roles: UserRoleResDto[];
  permissionKeys: string[];
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserInfo => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new Error('User not found in request');
    }
    return user;
  },
);

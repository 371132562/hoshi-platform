import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type {
  PermissionSnapshotResDto,
  UserRoleResDto,
} from '../../commonModules/user/user.dto';

type RequestWithUser = {
  user?: UserInfo;
};

export type UserInfo = {
  userId: string;
  username: string; // account name (login)
  displayName: string; // localized display name
  phone?: string;
  organizationId?: string | null;
  organization?: { id: string; name: string } | null;
  roles: UserRoleResDto[];
  permissionSnapshot: PermissionSnapshotResDto;
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

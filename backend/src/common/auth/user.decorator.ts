import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithUser {
  user?: UserInfo;
}

export type UserInfo = {
  userId: string;
  username: string; // account name (login)
  displayName: string; // localized display name
  phone?: string;
  roleId?: string;
  role?: {
    id: string;
    code?: string;
    displayName?: string;
    description?: string;
    allowedRoutes: string[];
  };
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

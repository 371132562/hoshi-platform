import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithUser {
  user?: UserInfo;
}

export type UserInfo = {
  userId: string;
  userCode: string;
  userName: string;
  department: string;
  email?: string;
  phone?: string;
  roleId?: string;
  roleName?: string;
  role?: {
    id: string;
    name: string;
    description?: string;
    allowedRoutes: string[];
  };
};

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserInfo => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new Error('User not found in request');
    }
    return user;
  },
);

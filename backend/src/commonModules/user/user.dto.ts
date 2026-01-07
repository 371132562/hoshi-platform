import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 用户相关 DTO 类定义
 */

/**
 * 用户信息类型
 */
export type UserItemRes = {
  id: string;
  username: string;
  name: string;
  organizationId: string | null;
  organization?: { id: string; name: string } | null;
  phone: string | null;
  role: { name?: string; allowedRoutes?: string[] };
};

/**
 * 更新用户 DTO
 */
export class UpdateUserReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  id: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  roleId?: string;
}
export type UpdateUserReq = InstanceType<typeof UpdateUserReqDto>;

/**
 * 用户列表查询 DTO
 */
export class UserListReqDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  roleId?: string;
}
export type UserListReq = InstanceType<typeof UserListReqDto>;

/**
 * 用户列表响应类型（分页）
 */
export type UserListResDto = {
  list: UserItemRes[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * 删除用户 DTO
 */
export class DeleteUserReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  id: string;
}
export type DeleteUserReq = InstanceType<typeof DeleteUserReqDto>;

/**
 * 创建用户（加密）DTO
 */
export class CreateUserEncryptedReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '用户姓名不能为空' })
  name: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: '加密密码不能为空' })
  encryptedPassword: string;

  @IsString()
  @IsNotEmpty({ message: '角色不能为空' })
  roleId: string;
}
export type CreateUserEncryptedReq = InstanceType<
  typeof CreateUserEncryptedReqDto
>;

/**
 * 重置用户密码（加密）DTO
 */
export class ResetUserPasswordEncryptedReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  id: string;

  @IsString()
  @IsNotEmpty({ message: '加密新密码不能为空' })
  encryptedNewPassword: string;
}
export type ResetUserPasswordEncryptedReq = InstanceType<
  typeof ResetUserPasswordEncryptedReqDto
>;

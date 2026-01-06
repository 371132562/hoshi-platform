import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 用户相关 DTO 类定义
 */

/**
 * 用户信息类型
 */
export type UserItem = {
  id: string;
  username: string;
  name: string;
  department: string | null;
  phone: string | null;
  role: { name?: string; allowedRoutes?: string[] };
};

/**
 * 更新用户 DTO
 */
export class UpdateUserDto {
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
  department?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  roleId?: string;
}
export type UpdateUser = InstanceType<typeof UpdateUserDto>;

/**
 * 用户列表查询 DTO
 */
export class UserListDto {
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
  department?: string;
}
export type UserList = InstanceType<typeof UserListDto>;

/**
 * 用户列表响应类型
 */
export type UserListResDto = UserItem[];

/**
 * 删除用户 DTO
 */
export class DeleteUserDto {
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  id: string;
}
export type DeleteUser = InstanceType<typeof DeleteUserDto>;

/**
 * 创建用户（加密）DTO
 */
export class CreateUserEncryptedDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '用户姓名不能为空' })
  name: string;

  @IsOptional()
  @IsString()
  department?: string;

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
export type CreateUserEncrypted = InstanceType<typeof CreateUserEncryptedDto>;

/**
 * 重置用户密码（加密）DTO
 */
export class ResetUserPasswordEncryptedDto {
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  id: string;

  @IsString()
  @IsNotEmpty({ message: '加密新密码不能为空' })
  encryptedNewPassword: string;
}
export type ResetUserPasswordEncrypted = InstanceType<
  typeof ResetUserPasswordEncryptedDto
>;

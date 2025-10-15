import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 用户相关 DTO 类定义
 */

/**
 * 用户信息类型
 */
export type UserItem = {
  id: string;
  code: string;
  name: string;
  department: string;
  email: string | null;
  phone: string | null;
  role?: { name?: string; allowedRoutes?: string[] } | null;
};

/**
 * 创建用户 DTO
 */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: '用户编码不能为空' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: '用户姓名不能为空' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '部门不能为空' })
  department: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;

  @IsOptional()
  @IsString()
  roleId?: string;
}
export type CreateUser = InstanceType<typeof CreateUserDto>;

/**
 * 更新用户 DTO
 */
export class UpdateUserDto {
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  id: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

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
 * 重置密码 DTO
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  id: string;

  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  newPassword: string;
}
export type ResetPassword = InstanceType<typeof ResetPasswordDto>;

/**
 * 创建用户（加密）DTO
 */
export class CreateUserEncryptedDto {
  @IsString()
  @IsNotEmpty({ message: '用户编码不能为空' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: '用户姓名不能为空' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '部门不能为空' })
  department: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: '加密密码不能为空' })
  encryptedPassword: string;

  @IsOptional()
  @IsString()
  roleId?: string;
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

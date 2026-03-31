import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * 用户相关 DTO 类定义
 */

export type UserRoleResDto = {
  id: string;
  code?: string;
  displayName?: string;
  description?: string | null;
  allowedRoutes?: string[];
};

export type PermissionSnapshotResDto = {
  isAdmin: boolean;
  allowedRoutes: string[];
};

/**
 * 用户信息类型
 */
export type UserItemResDto = {
  id: string;
  username: string;
  displayName: string;
  isSystem: boolean;
  organizationId: string | null;
  organization?: { id: string; name: string } | null;
  phone: string | null;
  roles: UserRoleResDto[];
  permissionSnapshot: PermissionSnapshotResDto;
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
  displayName?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: '至少选择一个角色' })
  @IsString({ each: true })
  roleIds?: string[];
}

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
  displayName?: string;

  @IsOptional()
  @IsString()
  roleId?: string;
}

/**
 * 用户列表响应类型（分页）
 */
export type UserListResDto = {
  list: UserItemResDto[];
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

/**
 * 创建用户（加密）DTO
 */
export class CreateUserEncryptedReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '用户姓名不能为空' })
  displayName: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: '加密密码不能为空' })
  encryptedPassword: string;

  @IsArray()
  @ArrayNotEmpty({ message: '至少选择一个角色' })
  @IsString({ each: true })
  roleIds: string[];
}

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

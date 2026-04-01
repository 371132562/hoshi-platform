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
  id: string; // 角色ID
  code?: string; // 角色编码，供系统逻辑判断使用
  displayName?: string; // 角色展示名称
  description?: string | null; // 角色补充说明
  permissionKeys?: string[]; // 角色拥有的稳定权限 key 列表
};

/**
 * 用户信息类型
 */
export type UserItemResDto = {
  id: string; // 用户主键ID
  username: string; // 登录账号
  displayName: string; // 后台展示姓名
  isSystem: boolean; // 是否为系统内置用户，不允许删除
  isAdmin: boolean; // 是否拥有超级管理员能力
  organizationId: string | null; // 所属部门ID
  organization?: { id: string; name: string } | null; // 所属部门简要信息
  phone: string | null; // 联系电话
  roles: UserRoleResDto[]; // 用户绑定的角色列表
  permissionKeys: string[]; // 聚合后的稳定权限 key 列表
};

/**
 * 更新用户 DTO
 */
export class UpdateUserReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  id: string; // 待编辑的用户ID

  @IsOptional()
  @IsString()
  username?: string; // 预留字段，当前编辑流程不直接修改用户名

  @IsOptional()
  @IsString()
  displayName?: string; // 更新后的用户姓名

  @IsOptional()
  @IsString()
  organizationId?: string; // 更新后的所属部门ID

  @IsOptional()
  @IsString()
  phone?: string; // 更新后的联系电话

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: '至少选择一个角色' })
  @IsString({ each: true })
  roleIds?: string[]; // 重新绑定的角色ID列表
}

/**
 * 用户列表查询 DTO
 */
export class UserListReqDto {
  @IsOptional()
  @Type(() => Number)
  page?: number; // 页码，从 1 开始

  @IsOptional()
  @Type(() => Number)
  pageSize?: number; // 每页数量

  @IsOptional()
  @IsString()
  displayName?: string; // 按姓名模糊搜索

  @IsOptional()
  @IsString()
  roleId?: string; // 按角色筛选
}

/**
 * 用户列表响应类型（分页）
 */
export type UserListResDto = {
  list: UserItemResDto[]; // 当前页用户列表
  total: number; // 总记录数
  page: number; // 当前页码
  pageSize: number; // 当前分页大小
};

/**
 * 删除用户 DTO
 */
export class DeleteUserReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  id: string; // 待删除的用户ID
}

/**
 * 创建用户（加密）DTO
 */
export class CreateUserEncryptedReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string; // 新建用户的登录账号

  @IsString()
  @IsNotEmpty({ message: '用户姓名不能为空' })
  displayName: string; // 新建用户的展示姓名

  @IsOptional()
  @IsString()
  organizationId?: string; // 所属部门ID

  @IsOptional()
  @IsString()
  phone?: string; // 联系电话

  @IsString()
  @IsNotEmpty({ message: '加密密码不能为空' })
  encryptedPassword: string; // 前端加密后的密码载荷

  @IsArray()
  @ArrayNotEmpty({ message: '至少选择一个角色' })
  @IsString({ each: true })
  roleIds: string[]; // 初始绑定的角色ID列表
}

/**
 * 重置用户密码（加密）DTO
 */
export class ResetUserPasswordEncryptedReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  id: string; // 待重置密码的用户ID

  @IsString()
  @IsNotEmpty({ message: '加密新密码不能为空' })
  encryptedNewPassword: string; // 前端加密后的新密码载荷
}

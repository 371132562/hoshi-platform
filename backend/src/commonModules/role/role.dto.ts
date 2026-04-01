import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 角色相关 DTO 类定义
 */

// 角色最小字段集（列表/业务使用）
export type RoleItemResDto = {
  id: string; // 角色主键ID
  code: string; // 角色编码，供系统逻辑判断使用
  displayName: string; // 角色显示名称
  isSystem: boolean; // 是否为系统内置角色
  description?: string | null; // 角色补充说明
  permissionKeys?: string[]; // 角色拥有的稳定权限 key 列表
};

/**
 * 创建角色 DTO
 */
export class CreateRoleReqDto {
  @IsString()
  @IsNotEmpty({ message: '角色编码不能为空' })
  code: string; // 新角色编码，要求全局唯一

  @IsString()
  @IsNotEmpty({ message: '角色显示名称不能为空' })
  displayName: string; // 新角色展示名称

  @IsOptional()
  @IsString()
  description?: string; // 角色说明

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[]; // 初始权限 key 列表
}

/**
 * 更新角色 DTO
 * 手动定义所有字段为可选，替代 PartialType
 */
export class UpdateRoleReqDto {
  @IsString()
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: string; // 待编辑的角色ID

  @IsOptional()
  @IsString()
  displayName?: string; // 更新后的角色展示名称

  @IsOptional()
  @IsString()
  description?: string; // 更新后的角色说明

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[]; // 更新后的权限 key 列表
}

/**
 * 角色列表查询 DTO
 */
export class RoleListReqDto {
  @IsOptional()
  @Type(() => Number)
  page?: number; // 页码，从 1 开始

  @IsOptional()
  @Type(() => Number)
  pageSize?: number; // 每页数量

  @IsOptional()
  @IsString()
  displayName?: string; // 按角色名称模糊搜索
}

/**
 * 角色列表项类型
 */
export type RoleListItemResDto = RoleItemResDto & { userCount: number };

// userCount 表示当前角色已绑定的用户数量

/**
 * 角色列表响应类型
 */
export type RoleListResDto = RoleListItemResDto[];

/**
 * 分配角色路由 DTO
 */
export class AssignRolePermissionKeysReqDto {
  @IsString()
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: string; // 待分配权限的角色ID

  @IsArray()
  @IsString({ each: true })
  permissionKeys: string[]; // 角色最终拥有的权限 key 列表
}

/**
 * 删除角色 DTO
 */
export class DeleteRoleReqDto {
  @IsString()
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: string; // 待删除的角色ID
}

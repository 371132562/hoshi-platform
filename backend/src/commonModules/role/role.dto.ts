import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 角色相关 DTO 类定义
 */

// 角色最小字段集（列表/业务使用）
export type RoleItem = {
  id: string;
  name: string;
  description?: string | null;
  allowedRoutes?: string[];
};

/**
 * 创建角色 DTO
 */
export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: '角色名称不能为空' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoutes?: string[];
}
export type CreateRole = InstanceType<typeof CreateRoleDto>;

/**
 * 更新角色 DTO
 */
export class UpdateRoleDto {
  @IsString()
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoutes?: string[];
}
export type UpdateRole = InstanceType<typeof UpdateRoleDto>;

/**
 * 角色列表查询 DTO
 */
export class RoleListDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  name?: string;
}
export type RoleList = InstanceType<typeof RoleListDto>;

/**
 * 角色列表项类型
 */
export type RoleListItemDto = RoleItem & { userCount: number };

/**
 * 角色列表响应类型
 */
export type RoleListResDto = RoleListItemDto[];

/**
 * 分配角色路由 DTO
 */
export class AssignRoleRoutesDto {
  @IsString()
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: string;

  @IsArray()
  @IsString({ each: true })
  allowedRoutes: string[];
}
export type AssignRoleRoutes = InstanceType<typeof AssignRoleRoutesDto>;

/**
 * 分配路由 DTO
 */
export class AssignRoutesDto {
  @IsString()
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: string;

  @IsArray()
  @IsString({ each: true })
  allowedRoutes: string[];
}
export type AssignRoutes = InstanceType<typeof AssignRoutesDto>;

/**
 * 删除角色 DTO
 */
export class DeleteRoleDto {
  @IsString()
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: string;
}
export type DeleteRole = InstanceType<typeof DeleteRoleDto>;

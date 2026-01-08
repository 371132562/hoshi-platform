import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 角色相关 DTO 类定义
 */

// 角色最小字段集（列表/业务使用）
export type RoleItemRes = {
  id: string;
  name: string;
  description?: string | null;
  allowedRoutes?: string[];
};

/**
 * 创建角色 DTO
 */
export class CreateRoleReqDto {
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

/**
 * 更新角色 DTO
 * 手动定义所有字段为可选，替代 PartialType
 */
export class UpdateRoleReqDto {
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

/**
 * 角色列表查询 DTO
 */
export class RoleListReqDto {
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

/**
 * 角色列表项类型
 */
export type RoleListItemResDto = RoleItemRes & { userCount: number };

/**
 * 角色列表响应类型
 */
export type RoleListResDto = RoleListItemResDto[];

/**
 * 分配角色路由 DTO
 */
export class AssignRoleRoutesReqDto {
  @IsString()
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: string;

  @IsArray()
  @IsString({ each: true })
  allowedRoutes: string[];
}

/**
 * 删除角色 DTO
 */
export class DeleteRoleReqDto {
  @IsString()
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: string;
}

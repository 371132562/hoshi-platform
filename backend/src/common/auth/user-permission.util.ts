import type {
  UserItemResDto,
  UserRoleResDto,
} from '../../commonModules/user/user.dto';
import { RoleCode } from '../config/constants';

type RoleSource = {
  id: string; // 角色ID
  code: string; // 角色编码
  displayName: string; // 角色显示名称
  description?: string | null; // 角色说明
  permissionKeys?: unknown; // 原始权限 key 数据，落库时为 JSON 字段
  delete?: number; // 软删除标记
};

type UserBaseSource = {
  id: string; // 用户ID
  username: string; // 登录账号
  displayName: string; // 展示姓名
  isSystem: boolean; // 是否系统内置用户
  organizationId: string | null; // 所属部门ID
  organization?: { id: string; name: string } | null; // 所属部门简要信息
  phone?: string | null; // 联系电话
};

/** 将 JSON 字段中的权限 key 归一化为字符串数组。 */
export const normalizePermissionKeys = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

/** 判断角色是否处于可用状态，自动过滤空值与已软删除角色。 */
const isActiveRole = (
  role: RoleSource | null | undefined,
): role is RoleSource => {
  if (!role) {
    return false;
  }

  return role.delete === undefined || role.delete === 0;
};

/** 将数据库角色集合去重后映射为响应 DTO。 */
export const buildUserRoles = (
  roleSources: Array<RoleSource | null | undefined>,
): UserRoleResDto[] => {
  const uniqueRoles = new Map<string, UserRoleResDto>();

  roleSources.filter(isActiveRole).forEach((role) => {
    if (uniqueRoles.has(role.id)) {
      return;
    }

    uniqueRoles.set(role.id, {
      id: role.id,
      code: role.code,
      displayName: role.displayName,
      description: role.description ?? null,
      permissionKeys: normalizePermissionKeys(role.permissionKeys),
    });
  });

  return Array.from(uniqueRoles.values());
};

/** 从角色列表中聚合出用户的超级管理员标记与最终权限 key 列表。 */
export const buildPermissionContext = (roles: UserRoleResDto[]) => {
  const isAdmin = roles.some((role) => role.code === RoleCode.ADMIN);
  const permissionKeys = Array.from(
    new Set(
      roles.flatMap((role) => normalizePermissionKeys(role.permissionKeys)),
    ),
  );

  return {
    isAdmin,
    permissionKeys,
  };
};

/** 将用户基础信息与角色来源拼装成统一的用户响应 DTO。 */
export const buildUserItemResDto = (
  user: UserBaseSource,
  roleSources: Array<RoleSource | null | undefined>,
): UserItemResDto => {
  const roles = buildUserRoles(roleSources);
  const permissionContext = buildPermissionContext(roles);

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    isSystem: user.isSystem,
    isAdmin: permissionContext.isAdmin,
    organizationId: user.organizationId,
    organization: user.organization ?? null,
    phone: user.phone ?? null,
    roles,
    permissionKeys: permissionContext.permissionKeys,
  };
};

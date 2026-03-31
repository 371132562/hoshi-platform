import type {
  PermissionSnapshotResDto,
  UserItemResDto,
  UserRoleResDto,
} from '../../commonModules/user/user.dto';
import { RoleCode } from '../config/constants';

type RoleSource = {
  id: string;
  code: string;
  displayName: string;
  description?: string | null;
  allowedRoutes?: unknown;
  delete?: number;
};

type UserBaseSource = {
  id: string;
  username: string;
  displayName: string;
  isSystem: boolean;
  organizationId: string | null;
  organization?: { id: string; name: string } | null;
  phone?: string | null;
};

export const normalizeAllowedRoutes = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const isActiveRole = (
  role: RoleSource | null | undefined,
): role is RoleSource => {
  if (!role) {
    return false;
  }

  return role.delete === undefined || role.delete === 0;
};

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
      allowedRoutes: normalizeAllowedRoutes(role.allowedRoutes),
    });
  });

  return Array.from(uniqueRoles.values());
};

export const buildPermissionSnapshot = (
  roles: UserRoleResDto[],
): PermissionSnapshotResDto => {
  const isAdmin = roles.some((role) => role.code === RoleCode.ADMIN);
  const allowedRoutes = Array.from(
    new Set(
      roles.flatMap((role) => normalizeAllowedRoutes(role.allowedRoutes)),
    ),
  );

  return {
    isAdmin,
    allowedRoutes,
  };
};

export const buildUserItemResDto = (
  user: UserBaseSource,
  roleSources: Array<RoleSource | null | undefined>,
): UserItemResDto => {
  const roles = buildUserRoles(roleSources);

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    isSystem: user.isSystem,
    organizationId: user.organizationId,
    organization: user.organization ?? null,
    phone: user.phone ?? null,
    roles,
    permissionSnapshot: buildPermissionSnapshot(roles),
  };
};

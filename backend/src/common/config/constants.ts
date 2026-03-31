/**
 * 系统角色编码枚举
 */
export enum RoleCode {
  ADMIN = 'admin',
}

/**
 * 系统内置角色
 */
export const SYSTEM_INIT_ROLES = [
  {
    code: RoleCode.ADMIN,
    displayName: '系统管理员', // 本地化显示名称
    description: '拥有所有权限，可以访问所有功能模块',
    isSystem: true, // 标识为系统内置，不可删除
  },
] as const;

/**
 * 系统内置用户
 */
export const SYSTEM_INIT_USERS = [
  {
    username: 'admin',
    displayName: '系统管理员',
    phone: '',
    password: '88888888',
    roleCodes: [RoleCode.ADMIN],
    isSystem: true, // 标识为系统内置，不可删除
  },
] as const;

/**
 * 系统初始化数据聚合
 */
export const SYSTEM_INIT_DATA = {
  roles: SYSTEM_INIT_ROLES,
  users: SYSTEM_INIT_USERS,
} as const;

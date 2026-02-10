// 系统内置超级管理员角色名称
export const SYSTEM_ADMIN_ROLE_NAME = 'admin';

/**
 * 系统内置角色
 */
export const SYSTEM_INIT_ROLES = [
  {
    name: SYSTEM_ADMIN_ROLE_NAME,
    description: '拥有所有权限，可以访问所有功能模块',
    isSystem: true, // 标识为系统内置，前端可据此显示"禁止删除"或特殊Tag
  },
] as const;

/**
 * 系统内置用户
 */
export const SYSTEM_INIT_USERS = [
  {
    username: 'admin',
    name: '系统管理员',
    phone: '',
    password: '88888888',
    roleName: SYSTEM_ADMIN_ROLE_NAME,
    isSystem: true,
  },
] as const;

/**
 * 系统初始化数据聚合
 */
export const SYSTEM_INIT_DATA = {
  roles: SYSTEM_INIT_ROLES,
  users: SYSTEM_INIT_USERS,
} as const;

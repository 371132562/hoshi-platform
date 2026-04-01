/**
 * @file 该脚本用于为数据库填充初始数据。
 * 它被设计为幂等的，这意味着它可以多次运行而不会创建重复的数据。
 * 它使用内存缓存来通过减少数据库查询次数来提高性能。
 */

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';

import { SYSTEM_INIT_DATA } from '../src/common/config/constants';
import { PrismaClient } from './generated/client';

// 解析数据库 URL，保持与 PrismaService 的文件定位逻辑一致。
const rawUrl = process.env.DATABASE_URL ?? 'file:./db/local.db';
let url = rawUrl.startsWith('file:') ? rawUrl.slice(5) : rawUrl;

// seed 命令默认在 backend 根目录执行，因此相对路径直接基于 process.cwd() 解析。
if (!path.isAbsolute(url)) {
  url = path.resolve(process.cwd(), url);
}

const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

/** 生成系统初始化用户要落库的 bcrypt 密码哈希。 */
const generatePassword = async (password: string) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/** 为系统初始用户批量生成加密后的密码字段。 */
const generateEncryptedUsers = async () => {
  return Promise.all(
    SYSTEM_INIT_DATA.users.map(async (user) => ({
      ...user,
      password: await generatePassword(user.password),
    })),
  );
};

/**
 * 认证相关数据初始化（角色和用户）
 */
async function seedAuthData() {
  console.log('开始初始化认证数据...');

  const roleMap = new Map<string, string>();

  for (const roleData of SYSTEM_INIT_DATA.roles) {
    // 1. 先按角色编码 upsert 系统角色，避免重复创建初始化角色。
    let role = await prisma.role.findFirst({
      where: { code: roleData.code, delete: 0 },
    });

    if (role) {
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          displayName: roleData.displayName,
          description: roleData.description,
          isSystem: roleData.isSystem,
          permissionKeys: [],
        },
      });
      console.log(
        `系统角色 "${roleData.displayName}" (${roleData.code}) 已更新`,
      );
    } else {
      role = await prisma.role.create({
        data: {
          code: roleData.code,
          displayName: roleData.displayName,
          description: roleData.description,
          isSystem: roleData.isSystem,
          permissionKeys: [],
        },
      });
      console.log(
        `系统角色 "${roleData.displayName}" (${roleData.code}) 已创建`,
      );
    }
    roleMap.set(roleData.code, role.id);
  }

  // 2. 再创建/更新系统用户，并按 roleCodes 重建用户-角色绑定关系。
  const encryptedUsers = await generateEncryptedUsers();
  for (const user of encryptedUsers) {
    const roleIds = user.roleCodes
      .map((roleCode) => roleMap.get(roleCode))
      .filter((roleId): roleId is string => Boolean(roleId));

    if (roleIds.length !== user.roleCodes.length) {
      console.warn(
        `警告: 用户 "${user.username}" 引用的角色集合存在未找到项，跳过创建`,
      );
      continue;
    }

    const existingUser = await prisma.user.findFirst({
      where: { username: user.username, delete: 0 },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          displayName: user.displayName,
          phone: user.phone,
          password: user.password,
          isSystem: user.isSystem,
        },
      });

      await prisma.userRole.deleteMany({
        where: { userId: existingUser.id },
      });

      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId: existingUser.id,
          roleId,
        })),
      });

      console.log(`系统用户 "${user.displayName}" (${user.username}) 已更新`);
    } else {
      const createdUser = await prisma.user.create({
        data: {
          username: user.username,
          displayName: user.displayName,
          phone: user.phone,
          password: user.password,
          isSystem: user.isSystem,
        },
      });

      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId: createdUser.id,
          roleId,
        })),
      });

      console.log(`系统用户 "${user.displayName}" (${user.username}) 已创建`);
    }
  }

  console.log('认证数据初始化完成！');
  console.log('\n初始用户账号：');
  SYSTEM_INIT_DATA.users.forEach((u) => {
    console.log(`账号: ${u.username} / 密码: ${u.password} (${u.displayName})`);
  });
}

/**
 * 主函数，是整个填充脚本的入口和调度中心。
 * 它负责初始化所有需要的缓存，并按正确的依赖顺序调用各个填充函数。
 */
async function main() {
  // 先初始化认证数据，确保后续默认用户和角色可用。
  await seedAuthData();

  // 再初始化根部门等基础组织数据。
  await seedOrganizationData();
}

/**
 * 部门相关数据初始化
 */
async function seedOrganizationData() {
  console.log('开始初始化部门数据...');
  const rootOrg = await prisma.organization.upsert({
    where: { id: '0' },
    update: {},
    create: {
      id: '0',
      name: '根部门',
      description: '系统默认根节点',
    },
  });
  console.log('部门数据初始化完成！根部门ID:', rootOrg.id);
}

// 脚本执行入口：统一处理失败退出码与数据库连接释放。
main()
  .catch((e) => {
    // 捕获并打印任何在异步执行过程中发生的错误。
    console.error(e, '数据生成过程中发生错误:');
    process.exit(1); // 以非零退出码退出，表示执行失败。
  })
  .finally(async () => {
    // 无论成功或失败，最后都确保断开与数据库的连接，释放资源。
    await prisma.$disconnect();
  });

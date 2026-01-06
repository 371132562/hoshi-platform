/**
 * @file 该脚本用于为数据库填充初始数据。
 * 它被设计为幂等的，这意味着它可以多次运行而不会创建重复的数据。
 * 它使用内存缓存来通过减少数据库查询次数来提高性能。
 */

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';

import { PrismaClient } from './generated/client';
import { generateUsers } from './initialData/authData';

// 解析数据库 URL
const rawUrl = process.env.DATABASE_URL ?? 'file:./db/local.db';
let url = rawUrl.startsWith('file:') ? rawUrl.slice(5) : rawUrl;

// 解析绝对路径：假设脚本在 backend 根目录下运行（pnpm prisma db seed）
if (!path.isAbsolute(url)) {
  url = path.resolve(process.cwd(), url);
}

const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

/**
 * 认证相关数据初始化（角色和用户）
 */
async function seedAuthData() {
  console.log('开始初始化认证数据...');
  // 只保留超管角色
  let adminRole = await prisma.role.findFirst({
    where: { name: 'admin', delete: 0 },
  });
  if (adminRole) {
    adminRole = await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        description: '拥有所有权限，可以访问所有功能模块',
        allowedRoutes: [],
      },
    });
    console.log('超管角色已存在，已更新');
  } else {
    adminRole = await prisma.role.create({
      data: {
        name: 'admin',
        description: '拥有所有权限，可以访问所有功能模块',
        allowedRoutes: [],
      },
    });
    console.log('超管角色已创建');
  }

  const encryptedUsers = await generateUsers();
  for (const user of encryptedUsers) {
    const existingUser = await prisma.user.findFirst({
      where: { username: user.username, delete: 0 },
    });
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: user.name,
          phone: user.phone,
          password: user.password,
          roleId: adminRole.id,
        },
      });
      console.log(`超管用户 "${user.name}" (${user.username}) 已更新`);
    } else {
      await prisma.user.create({
        data: {
          username: user.username,
          name: user.name,
          phone: user.phone,
          password: user.password,
          roleId: adminRole.id,
        },
      });
      console.log(`超管用户 "${user.name}" (${user.username}) 已创建`);
    }
  }
  console.log('认证数据初始化完成！');
  console.log('\n初始用户账号：');
  console.log('超管 账号/密码均为 8个8');
}

/**
 * 主函数，是整个填充脚本的入口和调度中心。
 * 它负责初始化所有需要的缓存，并按正确的依赖顺序调用各个填充函数。
 */
async function main() {
  // 认证相关数据初始化
  await seedAuthData();
  // 组织相关数据初始化
  await seedOrganizationData();
}

/**
 * 组织相关数据初始化
 */
async function seedOrganizationData() {
  console.log('开始初始化组织数据...');
  const rootOrg = await prisma.organization.upsert({
    where: { id: '0' },
    update: {},
    create: {
      id: '0',
      name: '根组织',
      sort: 0,
      description: '系统默认根节点',
    },
  });
  console.log('组织数据初始化完成！根组织ID:', rootOrg.id);
}

// 脚本的执行入口点。
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

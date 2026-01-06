import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/generated/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * 解析数据库 URL，处理相对路径和 dist 目录编译后路径问题
   * @param rawUrl 原始数据库 URL，支持 file: 前缀或纯路径
   * @returns 带 file: 前缀的绝对路径 URL
   */
  private static resolveDatabaseUrl(rawUrl: string): string {
    // 剥离 file: 前缀以便进行路径处理
    const filePath = rawUrl.startsWith('file:') ? rawUrl.slice(5) : rawUrl;

    // 绝对路径直接返回
    if (path.isAbsolute(filePath)) {
      return `file:${filePath}`;
    }

    // 相对路径需要基于 prisma 目录解析
    // __dirname 在 CommonJS 模块下指向当前文件所在目录
    // 编译后位于 dist/src/prisma/，源码位于 src/prisma/
    // 目标是找到项目根目录 (backend/)，因为 prisma.config.ts 在那里

    const startDir = __dirname;
    // NestJS/SWC 编译后结构是 dist/prisma（不是 dist/src/prisma）
    // 源码结构是 src/prisma
    // 两者都只需向上回退两层到达 backend 根目录
    const projectRoot = path.resolve(startDir, '../..');

    const absolutePath = path.resolve(projectRoot, filePath);

    // 确保数据库目录存在 (better-sqlite3 不会自动创建目录)
    const dbDir = path.dirname(absolutePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return `file:${absolutePath}`;
  }

  constructor() {
    const url = PrismaService.resolveDatabaseUrl(
      process.env.DATABASE_URL ?? 'file:./local.db',
    );

    const adapter = new PrismaBetterSqlite3({ url });
    super({
      adapter,
      // 连接池配置
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
      // 事务超时设置（毫秒）
      transactionOptions: {
        timeout: 10000, // 10秒超时
        maxWait: 10000, // 最大等待10秒
      },
    });
  }

  async onModuleInit() {
    await this.$connect();

    // 开启 SQLite WAL 模式与相关优化
    // 说明：
    // - WAL 写前日志能显著提升并发读写性能
    // - synchronous=NORMAL 在 WAL 下足够安全且更快
    // - busy_timeout 防止"database is locked"快速失败
    // - foreign_keys=ON 确保外键约束生效（Prisma/SQLite 默认有时不启用）
    // - cache_size 增加缓存大小提升性能
    // - temp_store 使用内存存储临时数据
    try {
      // 注意：journal_mode 设置会返回结果，需使用 $queryRaw 而非 $executeRaw
      await this.$queryRaw`PRAGMA journal_mode = WAL;`;
      await this.$queryRaw`PRAGMA synchronous = NORMAL;`;
      await this.$queryRaw`PRAGMA busy_timeout = 10000;`; // 增加到10秒
      await this.$queryRaw`PRAGMA foreign_keys = ON;`;
      await this.$queryRaw`PRAGMA cache_size = -64000;`; // 64MB 缓存
      await this.$queryRaw`PRAGMA temp_store = MEMORY;`; // 临时数据存储在内存
      await this.$queryRaw`PRAGMA mmap_size = 268435456;`; // 256MB 内存映射
      await this.$queryRaw`PRAGMA optimize;`; // 优化查询计划
    } catch (error) {
      // 保底日志，防止初始化失败影响服务启动
      // 这里不抛出，让服务继续运行，但建议观察日志
      console.warn('[Prisma] 初始化 SQLite PRAGMA 失败：', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

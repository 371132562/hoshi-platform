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
    // 1. 先剥离 file: 前缀，统一按文件路径处理。
    const filePath = rawUrl.startsWith('file:') ? rawUrl.slice(5) : rawUrl;

    // 2. 绝对路径直接补回 file: 前缀返回。
    if (path.isAbsolute(filePath)) {
      return `file:${filePath}`;
    }

    // 3. 相对路径统一基于 backend 根目录解析，避免源码与编译产物目录不一致。
    const startDir = __dirname;
    const projectRoot = path.resolve(startDir, '../..');

    const absolutePath = path.resolve(projectRoot, filePath);

    // 4. better-sqlite3 不会自动创建目录，因此这里主动补齐数据库目录。
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

    // 初始化 SQLite PRAGMA，统一收敛并发读写与外键约束等运行时配置。
    try {
      // journal_mode 会返回结果，因此需使用 $queryRaw 而不是 $executeRaw。
      await this.$queryRaw`PRAGMA journal_mode = WAL;`;
      await this.$queryRaw`PRAGMA synchronous = NORMAL;`;
      await this.$queryRaw`PRAGMA busy_timeout = 10000;`; // 增加到10秒
      await this.$queryRaw`PRAGMA foreign_keys = ON;`;
      await this.$queryRaw`PRAGMA cache_size = -64000;`; // 64MB 缓存
      await this.$queryRaw`PRAGMA temp_store = MEMORY;`; // 临时数据存储在内存
      await this.$queryRaw`PRAGMA mmap_size = 268435456;`; // 256MB 内存映射
      await this.$queryRaw`PRAGMA optimize;`; // 优化查询计划
    } catch (error) {
      // 这里不抛出，避免数据库优化项异常直接阻断整个服务启动。
      console.warn('[Prisma] 初始化 SQLite PRAGMA 失败：', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

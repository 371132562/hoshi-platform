import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      // 数据库连接配置优化
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
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

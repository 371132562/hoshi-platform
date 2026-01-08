import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { Prisma } from '@prisma/generated/client';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module';
import { WinstonLoggerService } from './common/services/winston-logger.service';

/**
 * 配置 Prisma.Decimal 的 JSON 序列化行为
 * 将 Decimal 实例序列化为 string，保持精度并便于前端消费
 */
Prisma.Decimal.prototype.toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLoggerService(),
  });

  app.enableCors();

  // 配置请求体大小限制 - 设置为10MB以支持大批量数据导入
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // 添加全局路径前缀
  app.setGlobalPrefix(`${process.env.DEPLOY_PATH || '/'}api`);

  await app.listen(process.env.PORT ?? 3888);
}
void bootstrap();

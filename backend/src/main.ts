import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module';
import { WinstonLoggerService } from './common/services/winston-logger.service';

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

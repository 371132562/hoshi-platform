import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/response.interceptor';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { WinstonLoggerService } from './common/services/winston-logger.service';
import { json, urlencoded } from 'express';
import { UserContextInterceptor } from './common/interceptors/user-context.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLoggerService(),
  });

  app.enableCors();

  // 配置请求体大小限制 - 设置为10MB以支持大批量数据导入
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // 注册全局拦截器（先写入用户上下文，再做统一响应包装）
  app.useGlobalInterceptors(
    new UserContextInterceptor(),
    new TransformInterceptor(),
  );

  // 添加全局路径前缀
  app.setGlobalPrefix(`${process.env.DEPLOY_PATH || '/'}api`);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 过滤掉未定义的字段
      transform: true, // 自动类型转换
      transformOptions: {
        enableImplicitConversion: true, // 隐式类型转换
      },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((e) =>
          Object.values(e.constraints ?? {}),
        );

        const hint = messages[1] ?? messages[0] ?? '请求参数错误';
        return new BadRequestException({ msg: hint, data: messages });
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3888);
}
void bootstrap();

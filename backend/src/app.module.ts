import { Module } from '@nestjs/common';
import { join } from 'path';
import { APP_GUARD, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { JwtAuthGuard } from './commonModules/auth/jwt-auth.guard';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { RequestContextMiddleware } from './common/middlewares/request-context.middleware';

//公共插件
import { AllExceptionsFilter } from './common/exceptions/allExceptionsFilter';

//公共模块
import { ServeStaticModule } from '@nestjs/serve-static';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from './commonModules/upload/upload.module';
import { AuthModule } from './commonModules/auth/auth.module';

//业务模块
import { RoleModule } from './businessModules/role/role.module';
import { UserModule } from './businessModules/user/user.module';
import { ArticleModule } from './businessModules/article/article.module';
import { SystemLogsModule } from './commonModules/systemLogs/systemLogs.module';

@Module({
  imports: [
    //公共模块
    // 配置 @nestjs/serve-static 模块来提供静态文件服务
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.env.UPLOAD_DIR as string), // 静态文件在服务器上的物理路径
        serveRoot: `${process.env.DEPLOY_PATH || '/'}images`, // URL 前缀，例如 /urbanization/images
        exclude: [process.env.DEPLOY_PATH || '/'], // 可选：排除不需要提供静态服务的路由
        serveStaticOptions: {
          preCompressed: true,
        },
      },
      {
        rootPath: join(process.cwd(), '..', 'frontend', 'dist'), // 指向 monorepo 根目录下的 frontend/dist
        serveRoot: process.env.DEPLOY_PATH || '/', // 设置前端静态文件的服务路径
        serveStaticOptions: {
          preCompressed: true,
        },
      },
    ),
    PrismaModule,
    UploadModule, // 上传模块
    AuthModule, // 认证模块

    //业务模块
    RoleModule,
    UserModule,
    ArticleModule, // 文章管理模块
    SystemLogsModule, // 系统日志模块
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_PIPE,
      useFactory: () =>
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
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

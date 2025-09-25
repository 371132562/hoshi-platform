import { Module } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { UploadModule } from '../../commonModules/upload/upload.module';
import { ConcurrencyModule } from '../../commonModules/concurrency/concurrency.module';

@Module({
  imports: [UploadModule, ConcurrencyModule],
  controllers: [ArticleController],
  providers: [ArticleService],
})
export class ArticleModule {}

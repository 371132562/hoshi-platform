import { Module } from '@nestjs/common';

import { ConcurrencyModule } from '../../commonModules/concurrency/concurrency.module';
import { UploadModule } from '../../commonModules/upload/upload.module';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';

@Module({
  imports: [UploadModule, ConcurrencyModule],
  controllers: [ArticleController],
  providers: [ArticleService],
})
export class ArticleModule {}

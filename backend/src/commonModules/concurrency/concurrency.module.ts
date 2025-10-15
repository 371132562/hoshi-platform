import { Module } from '@nestjs/common';

import { ConcurrencyService } from './concurrency.service';

@Module({
  providers: [ConcurrencyService],
  exports: [ConcurrencyService],
})
export class ConcurrencyModule {}

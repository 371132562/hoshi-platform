import { Module } from '@nestjs/common';
import { DataManagementController } from './dataManagement.controller';
import { DataManagementService } from './dataManagement.service';
import { ConcurrencyModule } from '../../commonModules/concurrency/concurrency.module';

@Module({
  imports: [ConcurrencyModule],
  controllers: [DataManagementController],
  providers: [DataManagementService],
  exports: [DataManagementService],
})
export class DataManagementModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AIController],
  providers: [AIService],
})
export class AIModule {}

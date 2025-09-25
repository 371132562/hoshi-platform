import { Body, Controller, Post, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AIService } from './ai.service';
import { AISummaryReqDto } from 'types/dto';

@Controller('ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(private readonly aiService: AIService) {}

  /**
   * @description 生成AI总结（SSE流式返回）。注意：POST方法返回text/event-stream。
   */
  @Post('summarySSE')
  async summarySSE(@Body() dto: AISummaryReqDto, @Res() res: Response) {
    return this.aiService.streamSummaryToResponse(dto, res);
  }
}

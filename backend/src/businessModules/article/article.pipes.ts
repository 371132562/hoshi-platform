import { Injectable, PipeTransform } from '@nestjs/common';
import type { Article } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { ErrorCode } from '../../../types/response';
import { BusinessException } from '../../common/exceptions/businessException';

/**
 * 文章存在性验证Pipe
 * 用途：验证文章是否存在，如果不存在则抛出异常
 * 使用场景：删除/更新文章时的存在性验证
 */
@Injectable()
export class ArticleExistsValidationPipe implements PipeTransform {
  constructor(private readonly prisma: PrismaService) {}

  async transform(value: string): Promise<string> {
    if (!value) {
      return value;
    }

    const article = await this.prisma.article.findFirst({
      where: { id: value, delete: 0 },
    });

    if (!article) {
      throw new BusinessException(
        ErrorCode.ARTICLE_NOT_FOUND,
        `文章ID ${value} 不存在或已被删除`,
      );
    }

    return value;
  }
}

/**
 * 根据ID注入文章实体（存在性校验 + 加载实体）
 * 用途：在进入控制器前完成存在性验证，并将文章实体传递给处理函数，简化Service中的重复查询
 */
@Injectable()
export class ArticleByIdPipe
  implements PipeTransform<string, Promise<Article>>
{
  constructor(private readonly prisma: PrismaService) {}

  async transform(value: string): Promise<Article> {
    const article = await this.prisma.article.findFirst({
      where: { id: value, delete: 0 },
    });

    if (!article) {
      throw new BusinessException(
        ErrorCode.ARTICLE_NOT_FOUND,
        `文章ID ${value} 不存在或已被删除`,
      );
    }

    return article;
  }
}

import { Injectable, PipeTransform } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { ErrorCode } from '../../../types/response';
import { BusinessException } from '../../common/exceptions/businessException';

/**
 * 文章标题唯一性验证Pipe
 * 用途：验证文章标题是否已存在，如果存在则抛出异常
 * 使用场景：创建/更新文章时的标题验证
 */
@Injectable()
export class ArticleTitleExistsValidationPipe implements PipeTransform {
  constructor(private readonly prisma: PrismaService) {}

  async transform(value: string): Promise<string> {
    if (!value) {
      return value;
    }

    const exist = await this.prisma.article.findFirst({
      where: { title: value, delete: 0 },
    });

    if (exist) {
      throw new BusinessException(
        ErrorCode.ARTICLE_TITLE_EXIST,
        '文章标题已存在',
      );
    }

    return value;
  }
}

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

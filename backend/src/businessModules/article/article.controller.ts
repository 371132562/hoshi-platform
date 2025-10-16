import { Body, Controller, Post } from '@nestjs/common';
import type { Article } from '@prisma/client';

import {
  ArticleItem,
  ArticleListDto,
  ArticleListResponse,
  ArticleMetaItem,
  ArticleOrderDto,
  CreateArticleDto,
  DeleteArticleDto,
  GetArticlesByPageDto,
  GetDetailsByIdsDto,
  UpdateArticleDto,
  UpsertArticleOrderDto,
} from './article.dto';
import { ArticleByIdPipe } from './article.pipes';
import { ArticleService } from './article.service';

@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post('list')
  async getArticleList(
    @Body() body: ArticleListDto,
  ): Promise<ArticleListResponse> {
    const { page = 1, pageSize = 10, title = '' } = body;
    return this.articleService.list(page, pageSize, title);
  }

  @Post('detail')
  getArticleDetail(
    @Body() _dto: DeleteArticleDto,
    @Body('id', ArticleByIdPipe) article: Article,
  ) {
    return this.articleService.detail(article);
  }

  @Post('create')
  async createArticle(@Body() createArticleDto: CreateArticleDto) {
    return this.articleService.create(createArticleDto);
  }

  @Post('update')
  async updateArticle(
    @Body() updateArticleDto: UpdateArticleDto,
    @Body('id', ArticleByIdPipe) article: Article,
  ) {
    return await this.articleService.update(article, updateArticleDto);
  }

  @Post('delete')
  async deleteArticle(
    @Body() _dto: DeleteArticleDto,
    @Body('id', ArticleByIdPipe) article: Article,
  ) {
    return await this.articleService.delete(article);
  }

  @Post('listAll')
  async listAll(): Promise<ArticleMetaItem[]> {
    return this.articleService.listAll();
  }

  @Post('order')
  async upsertArticleOrder(
    @Body() upsertArticleOrderDto: UpsertArticleOrderDto,
  ): Promise<ArticleOrderDto> {
    return this.articleService.upsertArticleOrder(upsertArticleOrderDto);
  }

  @Post('getByPage')
  async getArticlesByPage(
    @Body() { page }: GetArticlesByPageDto,
  ): Promise<ArticleItem[]> {
    return this.articleService.getArticlesByPage(page);
  }

  @Post('getDetailsByIds')
  async getDetailsByIds(
    @Body() { ids }: GetDetailsByIdsDto,
  ): Promise<ArticleItem[]> {
    return this.articleService.getDetailsByIds(ids);
  }
}

import { Body, Controller, Post } from '@nestjs/common';
import type { Article } from '@prisma/generated/client';

import {
  ArticleItemRes,
  ArticleListReqDto,
  ArticleListResDto,
  ArticleMetaItemRes,
  ArticleOrderResDto,
  CreateArticleReqDto,
  DeleteArticleReqDto,
  GetArticlesByPageReqDto,
  GetDetailsByIdsReqDto,
  UpdateArticleReqDto,
  UpsertArticleOrderReqDto,
} from './article.dto';
import { ArticleByIdPipe } from './article.pipes';
import { ArticleService } from './article.service';

@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post('list')
  async getArticleList(
    @Body() body: ArticleListReqDto,
  ): Promise<ArticleListResDto> {
    const { page = 1, pageSize = 10, title = '' } = body;
    return this.articleService.list(page, pageSize, title);
  }

  @Post('detail')
  getArticleDetail(
    @Body() _dto: DeleteArticleReqDto,
    @Body('id', ArticleByIdPipe) article: Article,
  ) {
    return this.articleService.detail(article);
  }

  @Post('create')
  async createArticle(@Body() createArticleDto: CreateArticleReqDto) {
    return this.articleService.create(createArticleDto);
  }

  @Post('update')
  async updateArticle(
    @Body() updateArticleDto: UpdateArticleReqDto,
    @Body('id', ArticleByIdPipe) article: Article,
  ) {
    return await this.articleService.update(article, updateArticleDto);
  }

  @Post('delete')
  async deleteArticle(
    @Body() _dto: DeleteArticleReqDto,
    @Body('id', ArticleByIdPipe) article: Article,
  ) {
    return await this.articleService.delete(article);
  }

  @Post('listAll')
  async listAll(): Promise<ArticleMetaItemRes[]> {
    return this.articleService.listAll();
  }

  @Post('order')
  async upsertArticleOrder(
    @Body() upsertArticleOrderDto: UpsertArticleOrderReqDto,
  ): Promise<ArticleOrderResDto> {
    return this.articleService.upsertArticleOrder(upsertArticleOrderDto);
  }

  @Post('getByPage')
  async getArticlesByPage(
    @Body() { page }: GetArticlesByPageReqDto,
  ): Promise<ArticleItemRes[]> {
    return this.articleService.getArticlesByPage(page);
  }

  @Post('getDetailsByIds')
  async getDetailsByIds(
    @Body() { ids }: GetDetailsByIdsReqDto,
  ): Promise<ArticleItemRes[]> {
    return this.articleService.getDetailsByIds(ids);
  }
}

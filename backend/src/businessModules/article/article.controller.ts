import { Body, Controller, Post } from '@nestjs/common';

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
import { ArticleService } from './article.service';
import {
  ArticleExistsValidationPipe,
  ArticleTitleExistsValidationPipe,
} from './article-validation.pipes';

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
  async getArticleDetail(@Body() body: DeleteArticleDto) {
    return this.articleService.detail(body.id);
  }

  @Post('create')
  async createArticle(
    @Body() createArticleDto: CreateArticleDto,
    @Body('title', ArticleTitleExistsValidationPipe) _title: string,
  ) {
    return this.articleService.create(createArticleDto);
  }

  @Post('update')
  async updateArticle(
    @Body() updateArticleDto: UpdateArticleDto,
    @Body('title', ArticleTitleExistsValidationPipe) _title: string,
  ) {
    return this.articleService.update(updateArticleDto);
  }

  @Post('delete')
  async deleteArticle(
    @Body() deleteArticleDto: DeleteArticleDto,
    @Body('id', ArticleExistsValidationPipe) _id: string,
  ) {
    return this.articleService.delete(deleteArticleDto.id);
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

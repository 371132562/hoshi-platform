import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * 文章相关 DTO 类定义
 */

/**
 * 文章信息类型
 */
export type ArticleItem = {
  id: string;
  title: string;
  content: string;
  images: string[];
};

/**
 * 文章元信息类型
 */
export type ArticleMetaItem = {
  id: string;
  title: string;
  updateTime?: Date;
};

/**
 * 创建文章 DTO
 */
export class CreateArticleDto {
  @IsString()
  @IsNotEmpty({ message: '文章标题不能为空' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '文章内容不能为空' })
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deletedImages?: string[];
}
export type CreateArticle = InstanceType<typeof CreateArticleDto>;

/**
 * 更新文章 DTO
 */
export class UpdateArticleDto {
  @IsString()
  @IsNotEmpty({ message: '文章ID不能为空' })
  id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deletedImages?: string[];
}
export type UpdateArticle = InstanceType<typeof UpdateArticleDto>;

/**
 * 文章列表查询 DTO
 */
export class ArticleListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page 必须为整数' })
  @Min(1, { message: 'page 最小为 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize 必须为整数' })
  @Min(1, { message: 'pageSize 最小为 1' })
  pageSize?: number;

  @IsOptional()
  @IsString()
  title?: string;
}
export type ArticleList = InstanceType<typeof ArticleListDto>;

/**
 * 文章列表响应类型
 */
export type ArticleListResponse = {
  list: ArticleMetaItem[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * 删除文章 DTO
 */
export class DeleteArticleDto {
  @IsString()
  @IsNotEmpty({ message: '文章ID不能为空' })
  id: string;
}
export type DeleteArticle = InstanceType<typeof DeleteArticleDto>;

/**
 * 更新文章排序 DTO
 */
export class UpsertArticleOrderDto {
  @IsString()
  @IsNotEmpty({ message: '页面不能为空' })
  page: string;

  @IsArray()
  @IsString({ each: true })
  articles: string[];
}
export type UpsertArticleOrder = InstanceType<typeof UpsertArticleOrderDto>;

/**
 * 文章排序 DTO
 */
export type ArticleOrderDto = {
  id: string;
  page: string;
  articles: string[];
  createTime: Date;
  updateTime: Date;
};

/**
 * 根据页面获取文章 DTO
 */
export class GetArticlesByPageDto {
  @IsString()
  @IsNotEmpty({ message: '页面不能为空' })
  page: string;
}
export type GetArticlesByPage = InstanceType<typeof GetArticlesByPageDto>;

/**
 * 根据ID数组获取文章详情 DTO
 */
export class GetDetailsByIdsDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
export type GetDetailsByIds = InstanceType<typeof GetDetailsByIdsDto>;

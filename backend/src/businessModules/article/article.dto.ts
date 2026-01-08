import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * 文章类型枚举
 */
export enum ArticleType {
  NORMAL = 'NORMAL',
}

/**
 * 文章相关 DTO 类定义
 */

/**
 * 文章信息类型
 */
export type ArticleItemRes = {
  id: string;
  title: string;
  content: string;
  images: string[];
  type: ArticleType;
};

/**
 * 文章元信息类型
 */
export type ArticleMetaItemRes = {
  id: string;
  title: string;
  updateTime?: Date;
};

/**
 * 创建文章 DTO
 */
export class CreateArticleReqDto {
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

  @IsEnum(ArticleType)
  @IsNotEmpty({ message: '文章类型不能为空' })
  type: ArticleType;
}

/**
 * 更新文章 DTO
 * 手动定义所有字段为可选，替代 PartialType
 */
export class UpdateArticleReqDto {
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

  @IsOptional()
  @IsEnum(ArticleType)
  type?: ArticleType;
}

/**
 * 文章列表查询 DTO
 */
export class ArticleListReqDto {
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

  @IsOptional()
  @IsEnum(ArticleType)
  type?: ArticleType;
}

/**
 * 文章列表响应类型
 */
export type ArticleListResDto = {
  list: ArticleMetaItemRes[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * 删除文章 DTO
 */
export class DeleteArticleReqDto {
  @IsString()
  @IsNotEmpty({ message: '文章ID不能为空' })
  id: string;
}

/**
 * 更新文章排序 DTO
 */
export class UpsertArticleOrderReqDto {
  @IsString()
  @IsNotEmpty({ message: '页面不能为空' })
  page: string;

  @IsArray()
  @IsString({ each: true })
  articles: string[];
}

/**
 * 文章排序 DTO
 */
export type ArticleOrderResDto = {
  id: string;
  page: string;
  articles: string[];
  createTime: Date;
  updateTime: Date;
};

/**
 * 根据页面获取文章 DTO
 */
export class GetArticlesByPageReqDto {
  @IsString()
  @IsNotEmpty({ message: '页面不能为空' })
  page: string;
}

/**
 * 根据ID数组获取文章详情 DTO
 */
export class GetDetailsByIdsReqDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

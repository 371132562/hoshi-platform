import { PartialType } from '@nestjs/mapped-types';
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
export type CreateArticleReq = InstanceType<typeof CreateArticleReqDto>;

/**
 * 更新文章 DTO
 * 使用 PartialType 继承 CreateArticleDto，所有字段自动变为可选
 */
export class UpdateArticleReqDto extends PartialType(CreateArticleReqDto) {
  @IsString()
  @IsNotEmpty({ message: '文章ID不能为空' })
  id: string;
}
export type UpdateArticleReq = InstanceType<typeof UpdateArticleReqDto>;

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
export type ArticleListReq = InstanceType<typeof ArticleListReqDto>;

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
export type DeleteArticleReq = InstanceType<typeof DeleteArticleReqDto>;

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
export type UpsertArticleOrderReq = InstanceType<
  typeof UpsertArticleOrderReqDto
>;

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
export type GetArticlesByPageReq = InstanceType<typeof GetArticlesByPageReqDto>;

/**
 * 根据ID数组获取文章详情 DTO
 */
export class GetDetailsByIdsReqDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
export type GetDetailsByIdsReq = InstanceType<typeof GetDetailsByIdsReqDto>;

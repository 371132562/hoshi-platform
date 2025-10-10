import { IsString, IsArray } from 'class-validator';

/**
 * 上传相关 DTO 类定义
 */

/**
 * 图片项类型
 */
export type ImageItem = {
  id: string;
  filename: string;
  originalName: string;
  hash: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * 上传响应类型
 */
export type UploadResponse = {
  filename: string;
  originalName: string;
  url: string;
};

/**
 * 孤儿图片项类型
 */
export type OrphanImageItem = {
  id: string;
  filename: string;
  originalName: string;
  createdAt: Date;
};

/**
 * 孤儿图片响应类型
 */
export type OrphanImagesResponse = {
  images: OrphanImageItem[];
  total: number;
};

/**
 * 删除孤儿图片 DTO
 */
export class DeleteOrphansDto {
  @IsArray()
  @IsString({ each: true })
  imageIds: string[];
}
export type DeleteOrphans = InstanceType<typeof DeleteOrphansDto>;

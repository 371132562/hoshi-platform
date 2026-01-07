import { IsArray, IsString } from 'class-validator';

/**
 * 上传相关 DTO 类定义
 */

/**
 * 图片项类型
 */
export type ImageItemRes = {
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
export type UploadResDto = {
  filename: string;
  originalName: string;
  url: string;
};

/**
 * 孤儿图片项类型
 */
export type OrphanImageItemRes = {
  id: string;
  filename: string;
  originalName: string;
  createdAt: Date;
};

/**
 * 孤儿图片响应类型
 */
export type OrphanImagesResDto = {
  images: OrphanImageItemRes[];
  total: number;
};

/**
 * 删除孤儿图片 DTO
 */
export class DeleteOrphansReqDto {
  @IsArray()
  @IsString({ each: true })
  imageIds: string[];
}
export type DeleteOrphansReq = InstanceType<typeof DeleteOrphansReqDto>;

/**
 * 删除单张图片 DTO
 */
export class DeleteImageReqDto {
  @IsString()
  filename: string;
}
export type DeleteImageReq = InstanceType<typeof DeleteImageReqDto>;

/**
 * 根据文件名批量删除孤儿图片 DTO
 */
export class DeleteOrphansByFilenamesReqDto {
  @IsArray()
  @IsString({ each: true })
  filenames: string[];
}
export type DeleteOrphansByFilenamesReq = InstanceType<
  typeof DeleteOrphansByFilenamesReqDto
>;

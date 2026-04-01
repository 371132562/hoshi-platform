import { IsArray, IsString } from 'class-validator';

/**
 * 上传相关 DTO 类定义
 */

/**
 * 图片项类型
 */
export type ImageItemResDto = {
  id: string; // 图片主键ID
  filename: string; // 服务器保存的唯一文件名
  originalName: string; // 用户上传时的原始文件名
  hash: string; // 文件内容哈希，用于去重与引用分析
  createdAt: Date; // 创建时间
  updatedAt: Date; // 最后更新时间
};

/**
 * 上传响应类型
 */
export type UploadResDto = {
  filename: string; // 保存后的文件名
  originalName: string; // 原始文件名
  url: string; // 对外访问地址
};

/**
 * 孤儿图片项类型
 */
export type OrphanImageItemResDto = {
  id: string; // 图片主键ID
  filename: string; // 保存后的文件名
  originalName: string; // 原始文件名
  createdAt: Date; // 上传时间
};

/**
 * 孤儿图片响应类型
 */
export type OrphanImagesResDto = {
  images: OrphanImageItemResDto[]; // 孤儿图片列表
  total: number; // 孤儿图片总数
};

/**
 * 删除孤儿图片 DTO
 */
export class DeleteOrphansReqDto {
  @IsArray()
  @IsString({ each: true })
  imageIds: string[]; // 待删除的孤儿图片ID列表
}

/**
 * 删除单张图片 DTO
 */
export class DeleteImageReqDto {
  @IsString()
  filename: string; // 待删除图片的保存文件名
}

/**
 * 根据文件名批量删除孤儿图片 DTO
 */
export class DeleteOrphansByFilenamesReqDto {
  @IsArray()
  @IsString({ each: true })
  filenames: string[]; // 待删除的文件名列表
}

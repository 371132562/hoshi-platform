import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationReqDto {
  @IsString()
  @IsNotEmpty({ message: '部门名称不能为空' })
  name: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateOrganizationReqDto extends PartialType(
  CreateOrganizationReqDto,
) {
  @IsString()
  @IsNotEmpty({ message: 'ID不能为空' })
  id: string;
}

export interface OrganizationRes {
  id: string;
  name: string;
  parentId?: string | null;
  parentName?: string | null;
  description?: string | null;
  createTime: string | Date;
  updateTime: string | Date;
  delete: number;
  children?: OrganizationRes[];
}

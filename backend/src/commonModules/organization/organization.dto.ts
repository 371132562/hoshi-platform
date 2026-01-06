import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: '组织名称不能为空' })
  name: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsInt()
  @IsOptional()
  sort?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @IsString()
  @IsNotEmpty({ message: 'ID不能为空' })
  id: string;
}

export interface Organization {
  id: string;
  name: string;
  parentId?: string | null;
  sort: number;
  description?: string | null;
  createTime: string | Date; // Date from prisma, string if serialized
  updateTime: string | Date;
  delete: number;
}

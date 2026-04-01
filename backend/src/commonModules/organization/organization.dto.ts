import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationReqDto {
  @IsString()
  @IsNotEmpty({ message: '部门名称不能为空' })
  name: string; // 部门显示名称，同一层级下应保持可识别

  @IsString()
  @IsOptional()
  parentId?: string; // 父部门ID；不传表示创建根层级部门

  @IsString()
  @IsOptional()
  description?: string; // 部门补充说明，用于后台维护备注
}

export class UpdateOrganizationReqDto {
  @IsString()
  @IsNotEmpty({ message: 'ID不能为空' })
  id: string; // 待更新的部门ID

  @IsOptional()
  @IsString()
  name?: string; // 更新后的部门名称

  @IsOptional()
  @IsString()
  parentId?: string; // 更新后的父部门ID；用于调整树结构

  @IsOptional()
  @IsString()
  description?: string; // 更新后的部门说明
}

export type OrganizationResDto = {
  id: string; // 部门主键ID
  name: string; // 部门名称
  parentId?: string | null; // 父部门ID；根部门为 null
  parentName?: string | null; // 父部门名称，便于列表直接展示
  description?: string | null; // 部门说明
  createTime: string | Date; // 创建时间
  updateTime: string | Date; // 最后更新时间
  delete: number; // 软删除标记：0=未删除，1=已删除
  children?: OrganizationResDto[]; // 子部门列表，仅树形展示时返回
};

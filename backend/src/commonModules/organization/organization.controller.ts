import { Body, Controller, Post } from '@nestjs/common';

import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './organization.dto';
import {
  OrganizationService,
  OrganizationTreeNode,
} from './organization.service';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * 获取部门树列表
   */
  @Post('list')
  async getOrganizationTree(): Promise<OrganizationTreeNode[]> {
    return this.organizationService.getOrganizationTree();
  }

  /**
   * 创建部门
   */
  @Post('create')
  async createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.organizationService.createOrganization(dto);
  }

  /**
   * 更新部门
   */
  @Post('update')
  async updateOrganization(@Body() dto: UpdateOrganizationDto) {
    return this.organizationService.updateOrganization(dto);
  }

  /**
   * 删除部门
   */
  @Post('delete')
  async deleteOrganization(@Body('id') id: string) {
    return this.organizationService.deleteOrganization(id);
  }
}

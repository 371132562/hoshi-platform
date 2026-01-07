import { Body, Controller, Post } from '@nestjs/common';

import {
  CreateOrganizationReqDto,
  OrganizationRes,
  UpdateOrganizationReqDto,
} from './organization.dto';
import { OrganizationService } from './organization.service';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * 获取部门树列表
   */
  @Post('list')
  async getOrganizationTree(): Promise<OrganizationRes[]> {
    return this.organizationService.getOrganizationTree();
  }

  /**
   * 创建部门
   */
  @Post('create')
  async createOrganization(@Body() dto: CreateOrganizationReqDto) {
    return this.organizationService.createOrganization(dto);
  }

  /**
   * 更新部门
   */
  @Post('update')
  async updateOrganization(@Body() dto: UpdateOrganizationReqDto) {
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

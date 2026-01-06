import { Body, Controller, Post } from '@nestjs/common';

import { ResponseBody } from '../../types/response';
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

  @Post('list')
  async getOrganizationTree(): Promise<ResponseBody<OrganizationTreeNode[]>> {
    const data = await this.organizationService.getOrganizationTree();
    return { code: 10000, msg: 'success', data };
  }

  @Post('create')
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
  ): Promise<ResponseBody<boolean>> {
    await this.organizationService.createOrganization(dto);
    return { code: 10000, msg: 'success', data: true };
  }

  @Post('update')
  async updateOrganization(
    @Body() dto: UpdateOrganizationDto,
  ): Promise<ResponseBody<boolean>> {
    await this.organizationService.updateOrganization(dto);
    return { code: 10000, msg: 'success', data: true };
  }

  @Post('delete')
  async deleteOrganization(
    @Body('id') id: string,
  ): Promise<ResponseBody<boolean>> {
    await this.organizationService.deleteOrganization(id);
    return { code: 10000, msg: 'success', data: true };
  }
}

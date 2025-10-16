import { Body, Controller, Post } from '@nestjs/common';
import type { Role } from '@prisma/client';

import {
  AssignRoleRoutesDto,
  CreateRoleDto,
  DeleteRoleDto,
  RoleListResDto,
  UpdateRoleDto,
} from './role.dto';
import { RoleByIdPipe, RoleNameExistsValidationPipe } from './role.pipes';
import { RoleService } from './role.service';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  /**
   * 获取角色列表
   */
  @Post('list')
  async getRoleList(): Promise<RoleListResDto> {
    return this.roleService.getRoleList();
  }

  /**
   * 创建角色
   */
  @Post('create')
  async createRole(
    @Body() createRoleDto: CreateRoleDto,
    @Body('name', RoleNameExistsValidationPipe) _name: string,
  ) {
    return this.roleService.createRole(createRoleDto);
  }

  /**
   * 编辑角色
   */
  @Post('update')
  async updateRole(
    @Body() updateRoleDto: UpdateRoleDto,
    @Body('id', RoleByIdPipe) role: Role,
  ) {
    return this.roleService.updateRole(role, updateRoleDto);
  }

  /**
   * 删除角色
   */
  @Post('delete')
  async deleteRole(
    @Body() _deleteRoleDto: DeleteRoleDto,
    @Body('id', RoleByIdPipe) role: Role,
  ) {
    return this.roleService.deleteRole(role);
  }

  /**
   * 分配角色菜单权限
   */
  @Post('assignRoutes')
  async assignRoleRoutes(@Body() dto: AssignRoleRoutesDto) {
    return this.roleService.assignRoleRoutes(dto);
  }
}

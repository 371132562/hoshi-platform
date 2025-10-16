import { Body, Controller, Post } from '@nestjs/common';

import {
  AssignRoleRoutesDto,
  CreateRoleDto,
  DeleteRoleDto,
  RoleListResDto,
  UpdateRoleDto,
} from '../../dto/role.dto';
import { RoleService } from './role.service';
import { RoleNameExistsValidationPipe } from './role-validation.pipes';

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
    @Body() dto: CreateRoleDto,
    @Body('name', RoleNameExistsValidationPipe) _name: string,
  ) {
    return this.roleService.createRole(dto);
  }

  /**
   * 编辑角色
   */
  @Post('update')
  async updateRole(@Body() dto: UpdateRoleDto) {
    return this.roleService.updateRole(dto);
  }

  /**
   * 删除角色
   */
  @Post('delete')
  async deleteRole(@Body() dto: DeleteRoleDto) {
    return this.roleService.deleteRole(dto);
  }

  /**
   * 分配角色菜单权限
   */
  @Post('assignRoutes')
  async assignRoleRoutes(@Body() dto: AssignRoleRoutesDto) {
    return this.roleService.assignRoleRoutes(dto);
  }
}

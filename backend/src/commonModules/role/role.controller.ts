import { Body, Controller, Post } from '@nestjs/common';
import type { Role } from '@prisma/generated/client';

import {
  AssignRoleRoutesReqDto,
  CreateRoleReqDto,
  DeleteRoleReqDto,
  RoleListResDto,
  UpdateRoleReqDto,
} from './role.dto';
import { RoleByIdPipe } from './role.pipes';
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
    @Body() createRoleDto: CreateRoleReqDto,
    // 这里可以添加 Pipe 校验 code 和 displayName 的唯一性
    // 为简化，暂时可以在 Service 中校验，或者使用自定义 Pipe
  ) {
    return this.roleService.createRole(createRoleDto);
  }

  /**
   * 编辑角色
   */
  @Post('update')
  async updateRole(
    @Body() updateRoleDto: UpdateRoleReqDto,
    @Body('id', RoleByIdPipe) role: Role,
  ) {
    return this.roleService.updateRole(role, updateRoleDto);
  }

  /**
   * 删除角色
   */
  @Post('delete')
  async deleteRole(
    @Body() _deleteRoleDto: DeleteRoleReqDto,
    @Body('id', RoleByIdPipe) role: Role,
  ) {
    return this.roleService.deleteRole(role);
  }

  /**
   * 分配角色菜单权限
   */
  @Post('assignRoutes')
  async assignRoleRoutes(@Body() dto: AssignRoleRoutesReqDto) {
    return this.roleService.assignRoleRoutes(dto);
  }
}

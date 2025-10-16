import { Body, Controller, Post } from '@nestjs/common';

import {
  CreateUserEncryptedDto,
  DeleteUserDto,
  ResetUserPasswordEncryptedDto,
  UpdateUserDto,
  UserListResDto,
} from '../../dto/user.dto';
import { UserService } from './user.service';
import { UserCodeExistsValidationPipe } from './user-validation.pipes';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取用户列表
   */
  @Post('list')
  async getUserList(): Promise<UserListResDto> {
    return this.userService.getUserList();
  }

  /**
   * 创建用户（加密）
   */
  @Post('create')
  async createUser(
    @Body() dto: CreateUserEncryptedDto,
    @Body('code', UserCodeExistsValidationPipe) _code: string,
  ) {
    return this.userService.createUserEncrypted(dto);
  }

  /**
   * 编辑用户
   */
  @Post('update')
  async updateUser(@Body() dto: UpdateUserDto) {
    return this.userService.updateUser(dto);
  }

  /**
   * 删除用户
   */
  @Post('delete')
  async deleteUser(@Body() dto: DeleteUserDto) {
    return this.userService.deleteUser(dto);
  }

  /**
   * 重置用户密码（加密）
   */
  @Post('resetPassword')
  async resetUserPassword(@Body() dto: ResetUserPasswordEncryptedDto) {
    return this.userService.resetUserPasswordEncrypted(dto);
  }
}

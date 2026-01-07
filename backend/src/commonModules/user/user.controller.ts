import { Body, Controller, Post } from '@nestjs/common';
import type { User } from '@prisma/generated/client';

import {
  CreateUserEncryptedReqDto,
  DeleteUserReqDto,
  ResetUserPasswordEncryptedReqDto,
  UpdateUserReqDto,
  UserListReqDto,
  UserListResDto,
} from './user.dto';
import { UserByIdPipe, UserCodeExistsValidationPipe } from './user.pipes';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取用户列表
   */
  @Post('list')
  async getUserList(@Body() query: UserListReqDto): Promise<UserListResDto> {
    return this.userService.getUserList(query);
  }

  /**
   * 创建用户（加密）
   */
  @Post('create')
  async createUser(
    @Body() createUserEncryptedDto: CreateUserEncryptedReqDto,
    @Body('code', UserCodeExistsValidationPipe) _code: string,
  ) {
    return this.userService.createUserEncrypted(createUserEncryptedDto);
  }

  /**
   * 编辑用户
   */
  @Post('update')
  async updateUser(
    @Body() updateUserDto: UpdateUserReqDto,
    @Body('id', UserByIdPipe) user: User,
  ) {
    return this.userService.updateUser(user, updateUserDto);
  }

  /**
   * 删除用户
   */
  @Post('delete')
  async deleteUser(
    @Body() _deleteUserDto: DeleteUserReqDto,
    @Body('id', UserByIdPipe) user: User,
  ) {
    return this.userService.deleteUser(user);
  }

  /**
   * 重置用户密码（加密）
   */
  @Post('resetPassword')
  async resetUserPassword(@Body() dto: ResetUserPasswordEncryptedReqDto) {
    return this.userService.resetUserPasswordEncrypted(dto);
  }
}

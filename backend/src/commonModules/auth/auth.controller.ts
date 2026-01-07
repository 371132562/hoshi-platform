import { Body, Controller, Post } from '@nestjs/common';

import { Public } from '../../common/auth/public.decorator';
import { CurrentUser, UserInfo } from '../../common/auth/user.decorator';
import {
  ChallengeResponse,
  LoginResDto,
  LoginWithHashReqDto,
  UserProfileResDto,
} from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户登录
   * @param loginDto 登录信息
   * @returns 登录响应
   */

  /**
   * 通用挑战接口 - 获取随机盐
   */
  @Public()
  @Post('challenge')
  challenge(): ChallengeResponse {
    return this.authService.getChallenge();
  }

  /**
   * 两步登录 - 第二步：提交前端根据盐计算的哈希
   */
  @Public()
  @Post('login')
  async login(
    @Body() loginWithHashDto: LoginWithHashReqDto,
  ): Promise<LoginResDto> {
    return this.authService.loginWithHash(loginWithHashDto);
  }

  /**
   * 获取当前用户信息
   * @param user 当前用户信息
   * @returns 用户信息
   */
  @Post('profile')
  async getProfile(@CurrentUser() user: UserInfo): Promise<UserProfileResDto> {
    const userProfile = await this.authService.getUserProfile(user.userId);
    return userProfile;
  }
}

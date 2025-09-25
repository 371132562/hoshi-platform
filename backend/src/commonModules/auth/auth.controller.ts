import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginResponseDto,
  UserProfileDto,
  ChallengeDto,
  ChallengeResDto,
  LoginWithHashDto,
} from '../../../types/dto';
import { CurrentUser, UserInfo } from '../../common/auth/user.decorator';
import { Public } from '../../common/auth/public.decorator';

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
  challenge(@Body() dto: ChallengeDto): ChallengeResDto {
    return this.authService.getChallenge(dto);
  }

  /**
   * 两步登录 - 第二步：提交前端根据盐计算的哈希
   */
  @Public()
  @Post('login')
  async login(@Body() dto: LoginWithHashDto): Promise<LoginResponseDto> {
    return this.authService.loginWithHash(dto);
  }

  /**
   * 获取当前用户信息
   * @param user 当前用户信息
   * @returns 用户信息
   */
  @Post('profile')
  async getProfile(@CurrentUser() user: UserInfo): Promise<UserProfileDto> {
    return this.authService.getUserProfile(user.userId);
  }
}

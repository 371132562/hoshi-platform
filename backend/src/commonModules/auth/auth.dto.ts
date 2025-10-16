import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 认证相关 DTO 类定义
 */
// 用户和角色类型从 user.dto 导入
import type { UserItem } from '../../businessModules/user/user.dto';

/**
 * 登录 DTO
 */
export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '用户编码不能为空' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}
export type Login = InstanceType<typeof LoginDto>;

/**
 * 挑战响应类型 - 直接返回加密的随机盐字符串
 */
export type ChallengeResponse = string;

/**
 * 登录响应类型
 */
export type LoginResponse = {
  token: string;
  user: UserItem;
};

/**
 * 登录响应 DTO
 */
export type LoginResponseDto = LoginResponse;

/**
 * 用户资料 DTO
 */
export type UserProfileDto = UserItem;

/**
 * 登录（哈希）DTO
 */
export class LoginWithHashDto {
  @IsString()
  @IsNotEmpty({ message: '用户编码不能为空' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: '加密数据不能为空' })
  encryptedData: string;
}
export type LoginWithHash = InstanceType<typeof LoginWithHashDto>;

/**
 * Token 载荷 DTO
 */
export type TokenPayloadDto = {
  sub: string;
  code: string;
  name: string;
  userId: string;
  userName: string;
  roleId?: string;
  roleName?: string;
  iat?: number;
  exp?: number;
};

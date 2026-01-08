import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 认证相关 DTO 类定义
 */
// 用户和角色类型从 user.dto 导入
import type { UserItemRes } from '../user/user.dto';

/**
 * 登录 DTO
 */
export class LoginReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}

/**
 * 挑战响应类型 - 直接返回加密的随机盐字符串
 */
export type ChallengeResponse = string;

/**
 * 登录响应类型
 */
export type LoginResDto = {
  token: string;
  user: UserItemRes;
};

/**
 * 用户资料 DTO
 */
export type UserProfileResDto = UserItemRes;

/**
 * 登录（哈希）DTO
 */
export class LoginWithHashReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '加密数据不能为空' })
  encryptedData: string;
}

/**
 * Token 载荷 DTO
 */
export type TokenPayloadResDto = {
  sub: string;
  username: string;
  name: string;
  userId: string;
  userName: string;
  roleId?: string;
  roleName?: string;
  iat?: number;
  exp?: number;
};

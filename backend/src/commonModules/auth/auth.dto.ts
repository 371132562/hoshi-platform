import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 认证相关 DTO 类定义
 */
// 用户和角色类型从 user.dto 导入
import type { UserItemResDto } from '../user/user.dto';

/**
 * 登录 DTO
 */
export class LoginReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string; // 登录账号

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string; // 明文密码，仅在 challenge 之前暂存于前端输入态
}

/**
 * 挑战响应类型 - 直接返回加密的随机盐字符串
 */
export type ChallengeResDto = string;

/**
 * 登录响应类型
 */
export type LoginResDto = {
  token: string; // 登录成功后签发的 JWT
  user: UserItemResDto; // 当前登录用户信息
};

/**
 * 用户资料 DTO
 */
export type UserProfileResDto = UserItemResDto;

/**
 * 登录（哈希）DTO
 */
export class LoginWithHashReqDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string; // 登录账号

  @IsString()
  @IsNotEmpty({ message: '加密数据不能为空' })
  encryptedData: string; // challenge 流程生成的加密登录载荷
}

/**
 * Token 载荷 DTO
 */
export class TokenPayloadResDto {
  sub: string; // JWT 标准 subject，一般等同于 userId
  userId: string; // 用户ID
  username: string; // account
  displayName: string; // localized name
}

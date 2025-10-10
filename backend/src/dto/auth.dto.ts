import { IsString, IsNotEmpty, IsIn, ValidateIf } from 'class-validator';

/**
 * 认证相关 DTO 类定义
 */

// 用户和角色类型从 user.dto 导入
import type { UserItem } from './user.dto';

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
 * 挑战 DTO
 */
export class ChallengeDto {
  // 当 type 不是 'create' 时，要求提供 code（登录/重置等场景）
  @ValidateIf((o: ChallengeDto) => o.type !== 'create')
  @IsString()
  @IsNotEmpty({ message: '用户编码不能为空' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'type 不能为空' })
  @IsIn(['login', 'create', 'reset'], {
    message: 'type 仅支持 login/create/reset',
  })
  type: string;
}
export type Challenge = InstanceType<typeof ChallengeDto>;

/**
 * 挑战响应类型
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

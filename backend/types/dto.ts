/* 所有需要用到的类型都放在这里 并按照业务逻辑分类 */

/**
 * 导出数据相关类型
 */
export enum ExportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
  JSON = 'json',
}

/**
 * 导出格式选项 - 用于前端渲染
 */
export const ExportFormatOptions = [
  { value: ExportFormat.CSV, label: 'CSV' },
  { value: ExportFormat.XLSX, label: 'XLSX (Excel)' },
  { value: ExportFormat.JSON, label: 'JSON' },
];

/**
 * 两步登录 - 第二步：提交前端crypto加密后的数据
 */
export type LoginWithHashDto = {
  code: string; // 用户编号
  encryptedData: string; // 使用crypto加密(随机盐+密码)后的结果
};

export type LoginResponseDto = {
  token: string; // JWT token
  user: {
    id: string;
    code: string;
    name: string;
    department: string;
    email?: string;
    phone?: string;
    roleId?: string;
    role?: {
      id: string;
      name: string;
      description?: string;
      allowedRoutes: string[];
    };
  };
};

export type TokenPayloadDto = {
  userId: string;
  userCode: string;
  userName: string;
  roleId?: string;
  roleName?: string;
  iat?: number;
  exp?: number;
};

export type UserProfileDto = {
  id: string;
  code: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  roleId?: string;
  role?: {
    id: string;
    name: string;
    description?: string;
    allowedRoutes: string[];
  };
  createTime: Date;
  updateTime: Date;
};

/*
 * ==================== 角色管理模块 ====================
 */

/**
 * 角色列表项 DTO
 */
export type RoleListItemDto = {
  id: string;
  name: string;
  description?: string;
  allowedRoutes: string[];
  userCount: number;
  createTime: Date;
  updateTime: Date;
};

/**
 * 角色列表响应 DTO
 */
export type RoleListResDto = RoleListItemDto[];

/**
 * 创建角色 DTO
 */
export type CreateRoleDto = {
  name: string;
  description?: string;
  allowedRoutes: string[];
};

/**
 * 编辑角色 DTO
 */
export type UpdateRoleDto = {
  id: string;
  name?: string;
  description?: string;
  allowedRoutes?: string[];
};

/**
 * 删除角色 DTO
 */
export type DeleteRoleDto = {
  id: string;
};

/**
 * 分配角色菜单权限 DTO
 */
export type AssignRoleRoutesDto = {
  id: string;
  allowedRoutes: string[];
};

/*
 * ==================== 用户管理模块 ====================
 */

/**
 * 用户列表项 DTO
 */
export type UserListItemDto = {
  id: string;
  code: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  roleId?: string;
  roleName?: string;
  createTime: Date;
  updateTime: Date;
};

/**
 * 用户列表响应 DTO
 */
export type UserListResDto = UserListItemDto[];

/**
 * 通用挑战请求 DTO
 */
export type ChallengeDto = {
  type: 'login' | 'create' | 'reset'; // 操作类型
};

/**
 * 通用挑战响应 DTO
 */
export type ChallengeResDto = string; // 随机盐字符串（用于crypto加密）

/**
 * 创建用户（加密）DTO
 */
export type CreateUserEncryptedDto = {
  code: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  encryptedPassword: string; // 使用crypto加密(随机盐+密码)后的结果
  roleId?: string;
};

/**
 * 编辑用户 DTO
 */
export type UpdateUserDto = {
  id: string;
  name?: string;
  department?: string;
  email?: string;
  phone?: string;
  roleId?: string;
};

/**
 * 删除用户 DTO
 */
export type DeleteUserDto = {
  id: string;
};

/**
 * 重置用户密码（加密）DTO
 */
export type ResetUserPasswordEncryptedDto = {
  id: string;
  encryptedNewPassword: string; // 使用crypto加密(随机盐+新密码)后的结果
};

/*
 * ==================== 系统日志模块 ====================
 * 系统日志模块提供系统级别和用户级别的日志查看功能
 * 支持按级别过滤、关键词搜索、分页显示等特性
 */

/**
 * 日志级别枚举
 * - 'info': 信息级别日志
 * - 'error': 错误级别日志
 * - 'all': 所有级别日志（用于查询时不过滤级别）
 */
export type LogLevel = 'info' | 'error' | 'all';

/**
 * 日志文件级别枚举
 * - 'info': 信息级别日志文件
 * - 'error': 错误级别日志文件
 * 注意：文件系统中不存在'all'级别，因为每个文件都是具体的级别
 */
export type LogFileLevel = 'info' | 'error';

/**
 * 系统日志文件列表请求参数
 * 用于获取系统级别的日志文件列表
 */
export type SystemLogFilesReqDto = {
  /** 日志级别过滤，可选值：'info' | 'error' | 'all'，默认为 'all' */
  level?: LogLevel;
};

/**
 * 系统日志文件信息
 * 描述单个日志文件的基本信息
 */
export type SystemLogFileItem = {
  /** 日志文件名，格式：application-{level}-{date}.log */
  filename: string;
  /** 日志文件日期，格式：YYYY-MM-DD */
  date: string;
  /** 日志级别，只能是 'info' 或 'error' */
  level: LogFileLevel;
  /** 文件大小，单位：字节 */
  size: number;
};

/**
 * 系统日志文件列表响应
 * 返回符合条件的日志文件列表
 */
export type SystemLogFilesResDto = {
  /** 日志文件列表 */
  files: SystemLogFileItem[];
};

/**
 * 用户日志文件列表请求参数
 * 用于获取特定用户的日志文件列表
 */
export type UserLogFilesReqDto = {
  /** 用户ID，必填，用于定位用户日志目录 */
  userId: string;
};

/**
 * 用户搜索结果项
 * 描述单个用户的基本信息
 */
export type LogUserItemDto = {
  /** 用户编号（作为日志目录名） */
  userCode: string;
  /** 用户姓名，若未匹配到则为空字符串 */
  userName: string;
};

/**
 * 用户搜索结果响应
 * 返回符合条件的用户列表
 */
export type LogUsersResDto = {
  /** 用户列表 */
  list: LogUserItemDto[];
};

/**
 * 读取日志请求参数（通用）
 * 用于读取系统日志或用户日志文件内容
 */
export type ReadLogReqDto = {
  /** 日志文件名，服务端会进行白名单校验，确保安全性 */
  filename: string;
};

/**
 * 读取用户日志请求参数
 * 继承自ReadLogReqDto，增加用户ID字段
 */
export type ReadUserLogReqDto = ReadLogReqDto & {
  /** 用户ID，用于定位用户日志目录 */
  userId: string;
};

/**
 * 日志行内容项
 * 描述单行日志的详细信息
 */
export type LogLineItem = {
  /** 时间戳，格式：YYYY-MM-DD HH:mm:ss */
  ts: string;
  /** 日志级别，如：'info', 'error' */
  level: string;
  /** 日志消息内容 */
  message: string;
  /** 原始日志行内容，包含完整信息 */
  raw: string;
};

/*
 * ==================== AI 生成模块 ====================
 */

/**
 * AI 总结请求参数
 */
export type AISummaryReqDto = {
  /** 国家ID */
  countryId: string;
  /** 年份 */
  year: number;
  /** 返回语言，可选：'zh' | 'en'，默认 'zh' */
  language?: 'zh' | 'en';
};

/*
 * ==================== 文章管理模块 ====================
 */

/**
 * 文章列表查询参数
 */
export type ArticleListDto = {
  page?: number;
  pageSize?: number;
  title?: string;
};

/**
 * 文章列表返回 DTO
 */
export type ArticleItem = {
  id: string;
  title: string;
  content: string;
  images: string[]; // 文章内包含的图片 为图片id组成的数组
  createTime: Date;
  updateTime: Date;
};

export type ArticleListResponse = {
  list: ArticleMetaItem[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * @description 创建新文章时使用的数据传输对象 (DTO)
 */
export type CreateArticleDto = {
  title: string;
  content: string;
  images: string[];
  deletedImages: string[];
};

/**
 * @description 更新现有文章时使用的数据传输对象 (DTO)
 */
export type UpdateArticleDto = {
  id: string;
  title?: string;
  content?: string;
  images: string[];
  deletedImages: string[];
};

/**
 * 文章元数据 - 用于列表，不包含文章内容
 */
export type ArticleMetaItem = Omit<ArticleItem, 'content' | 'images'>;

/**
 * 删除文章 DTO
 */
export type DeleteArticleDto = {
  id: string;
};
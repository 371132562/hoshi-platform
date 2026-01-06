import * as bcrypt from 'bcrypt';

// 生成加密密码
const generatePassword = async (password: string) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// 只保留超管角色，allowedRoutes为空数组
export const roles = [
  {
    name: 'admin',
    description: '拥有所有权限，可以访问所有功能模块',
    allowedRoutes: [],
  },
];

// 只保留超管用户，移除roleName字段
export const users = [
  {
    username: 'admin',
    name: '超级管理员',
    department: '超级管理员',
    email: '',
    phone: '',
    password: '88888888',
  },
];

// 生成加密后的用户数据
export const generateUsers = async () => {
  return Promise.all(
    users.map(async (user) => ({
      ...user,
      password: await generatePassword(user.password),
    })),
  );
};

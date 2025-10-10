// 文章管理API
export const articleList = '/article/list' // 获取文章列表
export const articleCreate = '/article/create' // 创建文章
export const articleUpdate = '/article/update' // 更新文章
export const articleDelete = '/article/delete' // 删除文章
export const articleDetail = '/article/detail' // 获取文章详情
export const articleListAll = '/article/listAll' // 获取所有文章列表
export const articleUpsertOrder = '/article/order' // 更新文章排序
export const articleGetByPage = '/article/getByPage' // 按页面获取文章
export const articleGetDetailsByIds = '/article/getDetailsByIds' // 根据ID批量获取文章详情

// 角色管理API
export const roleListApi = '/role/list' // 获取角色列表
export const roleCreateApi = '/role/create' // 创建角色
export const roleUpdateApi = '/role/update' // 更新角色
export const roleDeleteApi = '/role/delete' // 删除角色
export const roleAssignRoutesApi = '/role/assignRoutes' // 分配角色路由权限

// 认证相关API地址
export const profileApiUrl = '/auth/profile' // 获取用户信息
export const loginApiUrl = '/auth/login' // 用户登录（两步登录第二步：提交哈希）
export const challengeApiUrl = '/auth/challenge' // 通用挑战：获取随机盐

// 用户管理API
export const userListApi = '/user/list' // 获取用户列表
export const userCreateApi = '/user/create' // 创建用户（加密）
export const userUpdateApi = '/user/update' // 更新用户
export const userDeleteApi = '/user/delete' // 删除用户
export const userResetPasswordApi = '/user/resetPassword' // 重置用户密码（加密）

// 系统维护（图片）API
export const listOrphanImagesApi = '/upload/maintenance/listOrphans' // 获取孤立图片列表
export const deleteOrphanImagesApi = '/upload/maintenance/deleteOrphans' // 删除孤立图片

// 系统日志API
export const systemLogsListFiles = '/system/logs/files' // 获取系统日志文件列表
export const systemLogsRead = '/system/logs/read' // 读取系统日志内容
export const systemUserLogsListFiles = '/system/logs/user/files' // 获取用户日志文件列表
export const systemUserLogsRead = '/system/logs/user/read' // 读取用户日志内容
export const systemUserLogsList = '/system/logs/user/list' // 获取用户日志列表

// 数据管理API
export const dataManagementListByYear = '/dataManagement/listByYear' // 按年份获取数据管理列表
export const dataManagementYears = '/dataManagement/years' // 获取数据管理年份列表
export const dataManagementCountriesByYears = '/dataManagement/countriesByYears' // 按年份获取国家列表
export const dataManagementDetail = '/dataManagement/detail' // 获取数据管理详情
export const dataManagementCreate = '/dataManagement/create' // 创建数据管理记录
export const dataManagementBatchCreate = '/dataManagement/batchCreate' // 批量创建数据管理记录
export const dataManagementCheckExistingData = '/dataManagement/checkExistingData' // 检查数据是否存在
export const dataManagementBatchCheckExistingData = '/dataManagement/batchCheckExistingData' // 批量检查数据是否存在
export const dataManagementDelete = '/dataManagement/delete' // 删除数据管理记录
export const dataManagementExport = '/dataManagement/export' // 导出数据管理记录
export const dataManagementExportMultiYear = '/dataManagement/exportMultiYear' // 导出多年份数据管理记录

// 指标API
export const indicatorHierarchy = '/indicator/indicatorsHierarchy' // 获取指标层次结构
export const updateIndicatorWeights = '/indicator/updateWeights' // 更新指标权重

// 国家与大洲API
export const continentList = '/countryAndContinent/continents' // 获取大洲列表
export const countryList = '/countryAndContinent/countries' // 获取国家列表
export const urbanizationMap = '/countryAndContinent/urbanizationMap' // 获取城镇化地图数据
export const urbanizationUpdate = '/countryAndContinent/urbanizationUpdate' // 更新城镇化数据

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
export const articleCreateScoreStandard = '/article/createScoreStandard' // 创建评分标准
export const articleGetScoreStandard = '/article/getScoreStandard' // 获取评分标准

// 评分管理API
export const scoreCreate = '/score/create' // 创建评分记录
export const scoreBatchCreate = '/score/batchCreate' // 批量创建评分记录
export const scoreDetail = '/score/detail' // 获取评分详情（基础评分数据）
export const scoreDelete = '/score/delete' // 删除评分记录
export const scoreCheckExisting = '/score/checkExisting' // 检查评分数据是否存在
export const scoreBatchCheckExisting = '/score/batchCheckExisting' // 批量检查评分数据是否存在
export const scoreListByCountry = '/score/listByCountry' // 按国家获取评分列表
export const scoreEvaluationList = '/score/listEvaluation' // 获取评分评价规则列表
export const scoreEvaluationCreate = '/score/createEvaluation' // 创建评分评价规则
export const scoreYears = '/score/years' // 获取评分年份列表
export const scoreListByYear = '/score/listByYear' // 按年份获取评分列表
export const scoreListEvaluationDetailByYear = '/score/custom/listEvaluationDetailByYear' // 按年份获取评价详情列表（自定义文案）
export const scoreEvaluationDetailGet = '/score/custom/getEvaluationDetail' // 获取评价详情（自定义文案）
export const scoreEvaluationDetailUpsert = '/score/custom/upsertEvaluationDetail' // 保存/更新评价详情（自定义文案）
export const scoreEvaluationDetailDelete = '/score/custom/deleteEvaluationDetail' // 删除评价详情（自定义文案）
export const scoreGetEvaluationText = '/score/getEvaluationText' // 获取评价文案（根据评分匹配评价体系规则）
export const scoreCountriesByYears = '/score/countriesByYears' // 按年份获取国家列表
export const scoreExportMultiYear = '/score/exportMultiYear' // 导出多年份评分数据

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

// AI 生成
export const aiSummarySSE = '/ai/summarySSE' // AI 总结（SSE流）

import * as crypto from 'crypto';
/*
 * 并发压力测试脚本（读写混合压测，贴近真实场景）。
 *
 * 功能与原则：
 * - 覆盖 businessModules 下除 ai 外的主要“读接口”和“写接口”，混合并发执行；写入仅针对“测试年份”（最大年份+1），避免污染历史数据。
 * - 自动发现真实数据（年份、国家、文章ID、指标层级），所有操作基于库中真实数据，遵循 DTO 结构与服务端校验规则。
 * - 统一成功判定：非文件流要求 code === 10000；文件流以 HTTP 200 视为成功。
 * - 输出清晰的中文报告：总体统计、按读/写分类统计、端点维度明细（成功率与耗时 P95）。
 *
 * 运行示例：
 *   pnpm --filter urbanization-backend exec ts-node backend/scripts/stressTest.ts
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */

type HttpMethod = 'POST';

/**
 * 压测任务定义
 * 用于描述一个需要压测的API端点及其相关配置
 */
type EndpointTask = {
  name: string; // 端点标识，用于日志和统计显示，如 'article/list'
  path: string; // API路径，形如 '/article/list'
  method: HttpMethod; // HTTP方法，目前只支持POST
  body: Record<string, unknown> | undefined; // 请求体数据
  isFileStream?: boolean; // 是否为文件流接口（如导出接口），文件流接口没有统一的业务code包装
  op: 'read' | 'write'; // 操作类型：读操作（查询、列表等）或写操作（创建、更新、删除等）
  isComposite?: boolean; // 是否为复合操作（如先upsert再delete的原子操作）
  // 可选：自定义执行器，用于需要多步骤的业务链路（如先创建后更新再删除）
  runner?: (
    token: string,
  ) => Promise<{ status: number; data: any; code?: number }>;
};

/**
 * 压测统计结果
 * 记录单个端点的压测性能指标和业务响应统计
 */
type EndpointStats = {
  name: string; // 端点名称
  method: string; // HTTP方法
  path: string; // API路径
  requests: number; // 总请求数
  success: number; // 成功请求数（基于业务code 10000判断）
  fail: number; // 失败请求数
  http200: number; // HTTP 200状态码数量
  non200: number; // 非HTTP 200状态码数量
  avgMs: number; // 平均响应时间（毫秒）
  p95Ms: number; // P95响应时间（毫秒）
  p99Ms: number; // P99响应时间（毫秒）
  minMs: number; // 最小响应时间（毫秒）
  maxMs: number; // 最大响应时间（毫秒）
  lastError?: string; // 最后一次错误信息
  lastErrorParams?: any; // 最后一次错误的请求参数（用于复现）
  codeCounts: Record<string, number>; // 业务code分布统计，如 {"10000": 25, "20001": 3, "200_file": 2}
  qps: number; // 每秒查询数
  tps: number; // 每秒事务数
  errorRate: number; // 错误率（百分比）
  successRate: number; // 成功率（百分比）
};

// ==================== 配置常量 ====================
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3888/api').replace(
  /\/$/,
  '',
); // 后端服务地址
const USER_CODE = '88888888'; // 登录用户名
const USER_PASSWORD = '88888888'; // 登录密码

// ==================== 压测配置参数 ====================
const CONCURRENCY = 50; // 并发通道数量
const REQUESTS_PER_WORKER = 100; // 每个并发通道要执行的请求数（总请求数 = 并发通道数 × 每通道请求数）
const READ_WRITE_RATIO = 0.6; // 读操作占比
const NO_DATA_DEPENDENCY_WEIGHT = 0.6; // 无数据依赖任务权重
const FILE_STREAM_SUCCESS_CODES = [200, 201]; // 文件流接口的成功状态码（200 Created, 201 OK）
const MAX_INDICATORS_PER_REQUEST = 50; // 每次请求的最大指标数量
const MAX_COUNTRIES_PER_BATCH = 50; // 批量操作的最大国家数量
const MAX_COUNTRIES_PER_EXPORT = 50; // 导出操作的最大国家数量
const EXPORT_FORMATS = ['json', 'excel']; // 支持的导出格式
const REQUEST_DELAY_MS = 0; // 每个请求之间的间隔时间（毫秒）
const ENABLE_ERROR_PARAM_LOGGING = true; // 是否启用错误参数记录（默认启用）
const BASE_UNIQUE_YEAR = new Date().getFullYear() + 1; // 唯一年份基线，避免评语并发冲突

// 并发执行的错峰与任务间隔控制（仅当并发数>1时生效）
const WORKER_START_STAGGER_MS = 0; // 并发通道启动错峰延迟（ms）：workerIndex * WORKER_START_STAGGER_MS

// HTTP请求配置（本地常量，不依赖环境变量）
const HTTP_TIMEOUT_MS = 10000; // HTTP请求超时时间（毫秒）
const HTTP_KEEPALIVE = true; // 是否启用HTTP Keep-Alive
const CRYPTO_SECRET_KEY = 'urbanization-secret-key'; // 必须与后端 CryptoUtil.SECRET_KEY 一致

// ==================== 资源池与并发控制（用于拆分后的任务防止20002） ====================

class AsyncMutex {
  private promise: Promise<void> = Promise.resolve();
  lock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.promise.then(fn, fn);
    this.promise = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

// 文章ID池：用于 update/delete 从已创建文章中取用，避免更新/删除不存在
const articleIdPool: string[] = [];
const articlePoolMutex = new AsyncMutex();

// 评价详情池：用于 deleteEvaluationDetail 从已 upsert 的 year+countryId 中取用
type EvalDetailKey = { year: number; countryId: string };
const evalDetailPool: EvalDetailKey[] = [];
const evalDetailPoolMutex = new AsyncMutex();
let uniqueYearCounter = 0;

// ==================== 工具函数 ====================

/**
 * 延迟函数，用于控制请求间隔
 * @param ms 延迟毫秒数
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 为写操作生成唯一的数据以避免并发冲突
 * @param task 原始写操作任务
 * @param index 任务索引，用于生成唯一标识
 * @returns 包含唯一数据的写操作任务
 */
function generateUniqueWriteTask(
  task: EndpointTask,
  index: number,
): EndpointTask {
  const uniqueTask = { ...task };
  const timestamp = Date.now();
  const uniqueId = `${timestamp}-${index}`;

  if (task.name.includes('upsert+deleteEvaluationDetail')) {
    // 评价详情操作：使用唯一的文本内容
    uniqueTask.body = {
      ...task.body,
      year: BASE_UNIQUE_YEAR + index, // 确保每次复合任务使用唯一年份
      text: `测试评价详情-${uniqueId}`,
    };
  } else if (
    task.name.includes('dataManagement/create') ||
    task.name.includes('dataManagement/batchCreate')
  ) {
    // 数据管理操作：使用唯一的年份
    const uniqueYear = new Date().getFullYear() + Math.floor(index / 1000) + 1;
    if (task.body && typeof task.body === 'object') {
      uniqueTask.body = {
        ...task.body,
        year: uniqueYear,
      };
    }
  } else if (
    task.name.includes('score/create') ||
    task.name.includes('score/batchCreate')
  ) {
    // 评分操作：使用唯一的年份
    const uniqueYear = new Date().getFullYear() + Math.floor(index / 1000) + 1;
    if (task.body && typeof task.body === 'object') {
      uniqueTask.body = {
        ...task.body,
        year: uniqueYear,
      };
    }
  }

  return uniqueTask;
}

/**
 * 发送HTTP POST请求
 * @param url 请求URL
 * @param token JWT认证令牌
 * @param body 请求体数据
 * @param isFileStream 是否为文件流接口（如导出接口）
 * @returns 响应结果，包含状态码、数据和原始文件数据（如果是文件流）
 */
async function postJson(
  url: string,
  token: string | null,
  body?: any,
  isFileStream?: boolean,
): Promise<{ status: number; data: any; raw?: ArrayBuffer }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        ...(HTTP_KEEPALIVE ? { Connection: 'keep-alive' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (isFileStream) {
      const raw = await res.arrayBuffer();
      return { status: res.status, data: null, raw };
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // 非 JSON 返回
    }
    return { status: res.status, data };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new Error(`请求超时 (${HTTP_TIMEOUT_MS}ms): ${url}`);
    }
    throw error;
  }
}

/**
 * 使用与后端一致的加密方案生成 encryptedData
 * 格式：ivHex(32) + base64Cipher
 * 明文：`${salt}|${password}`
 */
function createEncryptedData(salt: string, password: string): string {
  // 与后端一致：key = SECRET_KEY 补 0 到 32 字节，再截断
  const key = Buffer.from(CRYPTO_SECRET_KEY.padEnd(32, '\0').slice(0, 32));
  const iv = crypto.randomBytes(16); // 16字节 => 32字符hex
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const plaintext = `${salt}|${password}`;
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const ivHex = iv.toString('hex');
  return ivHex + encrypted;
}

/**
 * 用户登录并获取JWT令牌
 * @returns JWT认证令牌
 * @throws 登录失败时抛出错误
 */
async function loginAndGetToken(): Promise<string> {
  // 第一步：获取挑战（salt）
  const challengeUrl = `${BASE_URL}/auth/challenge`;
  const challengeRes = await postJson(challengeUrl, null, { type: 'login' });
  if (challengeRes.status !== 200) {
    throw new Error(
      `获取挑战失败 status=${challengeRes.status} body=${JSON.stringify(challengeRes.data)}`,
    );
  }
  // 后端已改为直接返回字符串作为随机盐，但被响应拦截器包装为 { code, msg, data } 格式
  const salt = challengeRes.data?.data as string | undefined;
  if (!salt || typeof salt !== 'string') {
    throw new Error('获取挑战失败（缺少salt）');
  }

  // 第二步：前端本地加密（salt|password）并提交
  const encryptedData = createEncryptedData(salt, USER_PASSWORD);
  const loginUrl = `${BASE_URL}/auth/login`;
  const { status, data } = await postJson(loginUrl, null, {
    code: USER_CODE,
    encryptedData,
  });
  if (status !== 200) {
    throw new Error(`登录失败 status=${status} body=${JSON.stringify(data)}`);
  }
  const isOk = data && typeof data.code === 'number' && data.code === 10000;
  const token =
    isOk && data.data && typeof data.data.token === 'string'
      ? (data.data.token as string)
      : null;
  if (!token) {
    throw new Error(`登录失败（解析token失败） body=${JSON.stringify(data)}`);
  }
  return token;
}

/**
 * 发现真实数据，用于构建压测任务
 * 通过调用各种只读接口获取现有的文章ID、国家ID、年份、指标ID等真实数据
 * @param token JWT认证令牌
 * @returns 包含各种真实数据的对象，用于构建压测请求
 */
async function discoverRealData(token: string) {
  // 获取文章列表与ID
  const listAllUrl = `${BASE_URL}/article/listAll`;
  const listAll = await postJson(listAllUrl, token, {});
  const articleMetaList: Array<{ id: string }> = Array.isArray(
    listAll.data?.data,
  )
    ? listAll.data.data
    : [];
  const articleIds = articleMetaList.map((a) => a.id);

  // 国家与年份（数据管理）
  const yearsRes = await postJson(
    `${BASE_URL}/dataManagement/years`,
    token,
    {},
  );
  const dmYears: number[] = Array.isArray(yearsRes.data?.data)
    ? yearsRes.data.data
    : [];
  const pickDmYears = dmYears.slice(0, 2); // 取前两个年份
  let dmCountriesByYears: Array<{
    year: number;
    countries: Array<{ id: string }>;
  }> = [];
  if (pickDmYears.length > 0) {
    const cby = await postJson(
      `${BASE_URL}/dataManagement/countriesByYears`,
      token,
      { years: pickDmYears },
    );
    dmCountriesByYears = Array.isArray(cby.data?.data) ? cby.data.data : [];
  }
  const dmFirstYear = pickDmYears[0];
  const dmFirstCountryId = dmCountriesByYears[0]?.countries?.[0]?.id;

  // 国家与年份（评分）
  const scoreYearsRes = await postJson(`${BASE_URL}/score/years`, token, {});
  const scoreYears: number[] = Array.isArray(scoreYearsRes.data?.data)
    ? scoreYearsRes.data.data
    : [];
  const pickScoreYears = scoreYears.slice(0, 2);
  let scoreCountriesByYears: Array<{
    year: number;
    countries: Array<{ id: string }>;
  }> = [];
  if (pickScoreYears.length > 0) {
    const scby = await postJson(`${BASE_URL}/score/countriesByYears`, token, {
      years: pickScoreYears,
    });
    scoreCountriesByYears = Array.isArray(scby.data?.data)
      ? scby.data.data
      : [];
  }
  const scoreFirstYear = pickScoreYears[0];
  const scoreFirstCountryId = scoreCountriesByYears[0]?.countries?.[0]?.id;

  // 指标层级（为写接口准备 detailedIndicatorId 列表）
  const indi = await postJson(
    `${BASE_URL}/indicator/indicatorsHierarchy`,
    token,
    {},
  );
  const hierarchy: any[] = Array.isArray(indi.data?.data) ? indi.data.data : [];
  const allDetailedIds: string[] = [];
  hierarchy.forEach((top: any) => {
    (top.secondaryIndicators || []).forEach((sec: any) => {
      (sec.detailedIndicators || []).forEach((det: any) => {
        if (det?.id) allDetailedIds.push(det.id as string);
      });
    });
  });

  return {
    articleIds,
    dmYears: pickDmYears,
    dmFirstYear,
    dmFirstCountryId,
    dmCountriesByYears,
    scoreYears: pickScoreYears,
    scoreFirstYear,
    scoreFirstCountryId,
    scoreCountriesByYears,
    detailedIndicatorIds: allDetailedIds,
  };
}

/**
 * 构建只读端点任务
 * 根据发现的真实数据构建各种只读接口的压测任务
 * @param token JWT认证令牌
 * @param discovered 通过discoverRealData发现的真实数据
 * @returns 只读接口的压测任务数组
 */
function buildEndpointTasks(
  token: string,
  discovered: Awaited<ReturnType<typeof discoverRealData>>,
): EndpointTask[] {
  const tasks: EndpointTask[] = [];

  // article
  tasks.push(
    {
      name: 'article/list',
      path: '/article/list',
      method: 'POST',
      body: { page: 1, pageSize: 10, title: '' },
      op: 'read',
    },
    {
      name: 'article/listAll',
      path: '/article/listAll',
      method: 'POST',
      body: {},
      op: 'read',
    },
  );
  if (discovered.articleIds.length > 0) {
    tasks.push({
      name: 'article/detail',
      path: '/article/detail',
      method: 'POST',
      body: { id: discovered.articleIds[0] },
      op: 'read',
    });
    tasks.push({
      name: 'article/getDetailsByIds',
      path: '/article/getDetailsByIds',
      method: 'POST',
      body: { ids: discovered.articleIds.slice(0, 3) },
      op: 'read',
    });
  }
  tasks.push({
    name: 'article/getScoreStandard',
    path: '/article/getScoreStandard',
    method: 'POST',
    body: {},
    op: 'read',
  });

  // countryAndContinent
  tasks.push(
    {
      name: 'countryAndContinent/continents',
      path: '/countryAndContinent/continents',
      method: 'POST',
      body: { includeCountries: false },
      op: 'read',
    },
    {
      name: 'countryAndContinent/countries',
      path: '/countryAndContinent/countries',
      method: 'POST',
      body: { includeContinent: true },
      op: 'read',
    },
    {
      name: 'countryAndContinent/urbanizationMap',
      path: '/countryAndContinent/urbanizationMap',
      method: 'POST',
      body: {},
      op: 'read',
    },
  );

  // dataManagement
  tasks.push({
    name: 'dataManagement/years',
    path: '/dataManagement/years',
    method: 'POST',
    body: {},
    op: 'read',
  });
  if (discovered.dmYears.length > 0) {
    tasks.push({
      name: 'dataManagement/countriesByYears',
      path: '/dataManagement/countriesByYears',
      method: 'POST',
      body: { years: discovered.dmYears },
      op: 'read',
    });
    tasks.push({
      name: 'dataManagement/listByYear',
      path: '/dataManagement/listByYear',
      method: 'POST',
      body: { year: discovered.dmFirstYear, page: 1, pageSize: 10 },
      op: 'read',
    });
  }
  if (discovered.dmFirstCountryId && discovered.dmFirstYear) {
    tasks.push({
      name: 'dataManagement/detail',
      path: '/dataManagement/detail',
      method: 'POST',
      body: {
        countryId: discovered.dmFirstCountryId,
        year: discovered.dmFirstYear,
      },
      op: 'read',
    });
    tasks.push({
      name: 'dataManagement/checkExistingData',
      path: '/dataManagement/checkExistingData',
      method: 'POST',
      body: {
        countryId: discovered.dmFirstCountryId,
        year: discovered.dmFirstYear,
      },
      op: 'read',
    });
  }
  if (discovered.dmCountriesByYears.length > 0) {
    const year = discovered.dmCountriesByYears[0].year;
    const countryIds = discovered.dmCountriesByYears[0].countries
      .slice(0, 5)
      .map((c) => c.id);
    if (countryIds.length > 0) {
      tasks.push({
        name: 'dataManagement/batchCheckExistingData',
        path: '/dataManagement/batchCheckExistingData',
        method: 'POST',
        body: { year, countryIds },
        op: 'read',
      });
    }
  }
  if (discovered.dmCountriesByYears.length > 0) {
    // 导出（文件流，无统一 code 包装）
    const yearCountryPairs = discovered.dmCountriesByYears
      .slice(0, 1)
      .map((g) => ({
        year: g.year,
        countryIds: g.countries.slice(0, 3).map((c) => c.id),
      }));
    tasks.push({
      name: 'dataManagement/exportMultiYear',
      path: '/dataManagement/exportMultiYear',
      method: 'POST',
      body: { yearCountryPairs, format: EXPORT_FORMATS[0] }, // 使用配置的导出格式
      isFileStream: true,
      op: 'read',
    });
  }

  // indicator
  tasks.push({
    name: 'indicator/indicatorsHierarchy',
    path: '/indicator/indicatorsHierarchy',
    method: 'POST',
    body: {},
    op: 'read',
  });

  // score
  tasks.push({
    name: 'score/years',
    path: '/score/years',
    method: 'POST',
    body: {},
    op: 'read',
  });
  if (discovered.scoreYears.length > 0) {
    tasks.push({
      name: 'score/listByYear',
      path: '/score/listByYear',
      method: 'POST',
      body: { year: discovered.scoreFirstYear, page: 1, pageSize: 10 },
      op: 'read',
    });
    tasks.push({
      name: 'score/listByCountry',
      path: '/score/listByCountry',
      method: 'POST',
      body: {},
      op: 'read',
    });
  }
  if (discovered.scoreFirstCountryId && discovered.scoreFirstYear) {
    tasks.push({
      name: 'score/detail',
      path: '/score/detail',
      method: 'POST',
      body: {
        countryId: discovered.scoreFirstCountryId,
        year: discovered.scoreFirstYear,
      },
      op: 'read',
    });
    tasks.push({
      name: 'score/checkExisting',
      path: '/score/checkExisting',
      method: 'POST',
      body: {
        countryId: discovered.scoreFirstCountryId,
        year: discovered.scoreFirstYear,
      },
      op: 'read',
    });
    tasks.push({
      name: 'score/getEvaluationText',
      path: '/score/getEvaluationText',
      method: 'POST',
      body: {
        countryId: discovered.scoreFirstCountryId,
        year: discovered.scoreFirstYear,
      },
      op: 'read',
    });
  }
  if (discovered.scoreCountriesByYears.length > 0) {
    const year = discovered.scoreCountriesByYears[0].year;
    const countryIds = discovered.scoreCountriesByYears[0].countries
      .slice(0, 5)
      .map((c) => c.id);
    if (countryIds.length > 0) {
      tasks.push({
        name: 'score/batchCheckExisting',
        path: '/score/batchCheckExisting',
        method: 'POST',
        body: { year, countryIds },
        op: 'read',
      });
    }
  }
  if (discovered.scoreYears.length > 0) {
    tasks.push({
      name: 'score/custom/listEvaluationDetailByYear',
      path: '/score/custom/listEvaluationDetailByYear',
      method: 'POST',
      body: { year: discovered.scoreFirstYear, page: 1, pageSize: 10 },
      op: 'read',
    });
    if (discovered.scoreFirstCountryId && discovered.scoreFirstYear) {
      tasks.push({
        name: 'score/custom/getEvaluationDetail',
        path: '/score/custom/getEvaluationDetail',
        method: 'POST',
        body: {
          countryId: discovered.scoreFirstCountryId,
          year: discovered.scoreFirstYear,
        },
        op: 'read',
      });
    }

    // 添加分数管理的导出接口
    if (discovered.scoreCountriesByYears.length > 0) {
      const yearCountryPairs = discovered.scoreCountriesByYears
        .slice(0, 1)
        .map((g) => ({
          year: g.year,
          countryIds: g.countries
            .slice(0, MAX_COUNTRIES_PER_EXPORT)
            .map((c) => c.id),
        }));
      tasks.push({
        name: 'score/exportMultiYear',
        path: '/score/exportMultiYear',
        method: 'POST',
        body: { yearCountryPairs, format: 'json' },
        isFileStream: true,
        op: 'read',
      });
    }
  }

  // role & user（只读）
  tasks.push({
    name: 'role/list',
    path: '/role/list',
    method: 'POST',
    body: {},
    op: 'read',
  });
  tasks.push({
    name: 'user/list',
    path: '/user/list',
    method: 'POST',
    body: {},
    op: 'read',
  });

  return tasks;
}

/**
 * 构建写操作端点任务
 * 根据发现的真实数据构建各种写操作接口的压测任务
 * 使用"测试年份"（现有最大年份+1）进行写入，避免与生产数据冲突
 * @param discovered 通过discoverRealData发现的真实数据
 * @returns 包含写操作任务、测试年份和目标国家的对象
 */
function buildWriteEndpointTasks(
  discovered: Awaited<ReturnType<typeof discoverRealData>>,
): { tasks: EndpointTask[]; testYear: number; targetCountries: string[] } {
  const detailedIds = discovered.detailedIndicatorIds;
  const maxDmYear =
    discovered.dmYears.length > 0
      ? Math.max(...discovered.dmYears)
      : new Date().getFullYear();
  const maxScoreYear =
    discovered.scoreYears.length > 0
      ? Math.max(...discovered.scoreYears)
      : new Date().getFullYear();
  const testYear = Math.max(maxDmYear, maxScoreYear) + 1;
  const candidateCountries = (
    discovered.dmCountriesByYears[0]?.countries ||
    discovered.scoreCountriesByYears[0]?.countries ||
    []
  ).map((c) => c.id);
  const uniqueCountries = Array.from(new Set(candidateCountries));
  const targetCountries = uniqueCountries.slice(
    0,
    Math.min(MAX_COUNTRIES_PER_BATCH, uniqueCountries.length),
  );
  const firstCountry = targetCountries[0];
  const batchCountries = targetCountries.slice(
    0,
    Math.min(3, targetCountries.length),
  );

  const tasks: EndpointTask[] = [];
  if (!detailedIds || detailedIds.length === 0 || !firstCountry) {
    return { tasks, testYear, targetCountries };
  }

  tasks.push({
    name: 'dataManagement/create',
    path: '/dataManagement/create',
    method: 'POST',
    body: {
      countryId: firstCountry,
      year: testYear,
      indicators: detailedIds
        .slice(0, MAX_INDICATORS_PER_REQUEST)
        .map((id) => ({
          detailedIndicatorId: id,
          value: Math.round(Math.random() * 10000) / 100,
        })),
    },
    op: 'write',
  });

  if (batchCountries.length > 0) {
    tasks.push({
      name: 'dataManagement/batchCreate',
      path: '/dataManagement/batchCreate',
      method: 'POST',
      body: {
        year: testYear,
        countries: batchCountries.map((cid) => ({
          countryId: cid,
          indicators: detailedIds
            .slice(0, MAX_INDICATORS_PER_REQUEST)
            .map((id) => ({
              detailedIndicatorId: id,
              value: Math.round(Math.random() * 10000) / 100,
            })),
        })),
      },
      op: 'write',
    });
  }

  tasks.push({
    name: 'score/create',
    path: '/score/create',
    method: 'POST',
    body: {
      countryId: firstCountry,
      year: testYear,
      totalScore: 60 + Math.round(Math.random() * 3500) / 100,
      urbanizationProcessDimensionScore:
        50 + Math.round(Math.random() * 4500) / 100,
      humanDynamicsDimensionScore: 50 + Math.round(Math.random() * 4500) / 100,
      materialDynamicsDimensionScore:
        50 + Math.round(Math.random() * 4500) / 100,
      spatialDynamicsDimensionScore:
        50 + Math.round(Math.random() * 4500) / 100,
    },
    op: 'write',
  });

  if (batchCountries.length > 0) {
    tasks.push({
      name: 'score/batchCreate',
      path: '/score/batchCreate',
      method: 'POST',
      body: {
        year: testYear,
        scores: batchCountries.map((cid) => ({
          countryId: cid,
          totalScore: 60 + Math.round(Math.random() * 3500) / 100,
          urbanizationProcessDimensionScore:
            50 + Math.round(Math.random() * 4500) / 100,
          humanDynamicsDimensionScore:
            50 + Math.round(Math.random() * 4500) / 100,
          materialDynamicsDimensionScore:
            50 + Math.round(Math.random() * 4500) / 100,
          spatialDynamicsDimensionScore:
            50 + Math.round(Math.random() * 4500) / 100,
        })),
      },
      op: 'write',
    });
  }

  // 文章写链路：拆分为 create / update / delete 三个独立任务
  tasks.push({
    name: 'article/create',
    path: '/article/create',
    method: 'POST',
    body: {},
    op: 'write',
    runner: async (tkn: string) => {
      const res = await postJson(`${BASE_URL}/article/create`, tkn, {
        title: `压测文章-${Date.now()}`,
        content: '这是一篇用于压测的文章内容。',
        images: [],
        deletedImages: [],
      });
      if (
        res.status === 200 &&
        res.data?.code === 10000 &&
        res.data?.data?.id
      ) {
        const id = res.data.data.id as string;
        await articlePoolMutex.lock(async () => {
          articleIdPool.push(id);
        });
      }
      // 防止 ESLint 误报无 await（此函数已 await 网络请求）
      await Promise.resolve();
      return { status: res.status, data: res.data, code: res.data?.code };
    },
  });

  tasks.push({
    name: 'article/update',
    path: '/article/update',
    method: 'POST',
    body: {},
    op: 'write',
    runner: async (tkn: string) => {
      let id: string | null = null;
      await articlePoolMutex.lock(async () => {
        id = articleIdPool.pop() || null;
      });
      if (!id) {
        // 自我保障：先创建一篇再更新
        const created = await postJson(`${BASE_URL}/article/create`, tkn, {
          title: `压测文章-${Date.now()}`,
          content: '这是一篇用于压测的文章内容（用于update预热）。',
          images: [],
          deletedImages: [],
        });
        if (
          created.status === 200 &&
          created.data?.code === 10000 &&
          created.data?.data?.id
        ) {
          id = created.data.data.id as string;
        } else {
          return {
            status: created.status,
            data: created.data,
            code: created.data?.code,
          };
        }
      }
      const upd = await postJson(`${BASE_URL}/article/update`, tkn, {
        id,
        title: `压测文章更新-${Date.now()}`,
        images: [],
        deletedImages: [],
      });
      // 更新后放回池，供 delete 使用
      if (id && upd.status === 200 && upd.data?.code === 10000) {
        await articlePoolMutex.lock(async () => {
          articleIdPool.push(id as string);
        });
      }
      await Promise.resolve();
      return { status: upd.status, data: upd.data, code: upd.data?.code };
    },
  });

  tasks.push({
    name: 'article/delete',
    path: '/article/delete',
    method: 'POST',
    body: {},
    op: 'write',
    runner: async (tkn: string) => {
      let id: string | null = null;
      await articlePoolMutex.lock(async () => {
        id = articleIdPool.pop() || null;
      });
      if (!id) {
        // 自我保障：先创建一篇再删除，确保不出现20002
        const created = await postJson(`${BASE_URL}/article/create`, tkn, {
          title: `压测文章-${Date.now()}`,
          content: '这是一篇用于压测的文章内容（用于delete预热）。',
          images: [],
          deletedImages: [],
        });
        if (
          created.status === 200 &&
          created.data?.code === 10000 &&
          created.data?.data?.id
        ) {
          id = created.data.data.id as string;
        } else {
          return {
            status: created.status,
            data: created.data,
            code: created.data?.code,
          };
        }
      }
      const del = await postJson(`${BASE_URL}/article/delete`, tkn, { id });
      await Promise.resolve();
      return { status: del.status, data: del.data, code: del.data?.code };
    },
  });

  // 评价详情：拆分为 upsertEvaluationDetail / deleteEvaluationDetail 两个独立任务
  tasks.push({
    name: 'score/custom/upsertEvaluationDetail',
    path: '/score/custom/upsertEvaluationDetail',
    method: 'POST',
    body: {},
    op: 'write',
    runner: async (tkn: string) => {
      const year = BASE_UNIQUE_YEAR + uniqueYearCounter++;
      const countryId = firstCountry;
      const res = await postJson(
        `${BASE_URL}/score/custom/upsertEvaluationDetail`,
        tkn,
        {
          year,
          countryId,
          text: `测试评价详情 ${Date.now()}-${year}`,
          images: [],
          deletedImages: [],
        },
      );
      if (res.status === 200 && res.data?.code === 10000) {
        await evalDetailPoolMutex.lock(async () => {
          evalDetailPool.push({ year, countryId });
        });
      }
      await Promise.resolve();
      return { status: res.status, data: res.data, code: res.data?.code };
    },
  });

  tasks.push({
    name: 'score/custom/deleteEvaluationDetail',
    path: '/score/custom/deleteEvaluationDetail',
    method: 'POST',
    body: {},
    op: 'write',
    runner: async (tkn: string) => {
      let key: EvalDetailKey | null = null;
      await evalDetailPoolMutex.lock(async () => {
        key = evalDetailPool.pop() || null;
      });
      if (!key) {
        // 自我保障：先 upsert 一个再删除，避免 20002
        const year = BASE_UNIQUE_YEAR + uniqueYearCounter++;
        const countryId = firstCountry;
        const up = await postJson(
          `${BASE_URL}/score/custom/upsertEvaluationDetail`,
          tkn,
          {
            year,
            countryId,
            text: `测试评价详情 ${Date.now()}-${year}-for-del`,
            images: [],
            deletedImages: [],
          },
        );
        if (up.status === 200 && up.data?.code === 10000) {
          key = { year, countryId };
        } else {
          return { status: up.status, data: up.data, code: up.data?.code };
        }
      }
      const del = await postJson(
        `${BASE_URL}/score/custom/deleteEvaluationDetail`,
        tkn,
        key,
      );
      await Promise.resolve();
      return { status: del.status, data: del.data, code: del.data?.code };
    },
  });

  return { tasks, testYear, targetCountries };
}

/**
 * 计算压测统计数据
 * 根据请求耗时、状态码、业务code等数据计算性能指标
 * @param name 端点名称
 * @param path API路径
 * @param method HTTP方法
 * @param durations 所有请求的耗时数组（毫秒）
 * @param statusRecords 所有请求的HTTP状态码数组
 * @param codeSuccess 基于业务code的成功请求数
 * @param codeFail 基于业务code的失败请求数
 * @param lastError 最后一次错误信息
 * @param codeCounts 业务code分布统计
 * @returns 计算后的压测统计结果
 */
function computeStats(
  name: string,
  path: string,
  method: string,
  durations: number[],
  statusRecords: number[],
  codeSuccess: number,
  codeFail: number,
  lastError: string | undefined,
  codeCounts: Record<string, number>,
  testDurationSeconds: number = 1, // 测试持续时间（秒）
  lastErrorParams?: any, // 最后一次错误的请求参数
): EndpointStats {
  // 以成功+失败作为权威请求数，避免异常分支未记录耗时导致的不一致
  const success = codeSuccess;
  const fail = codeFail;
  const requests = success + fail;

  // 确保数据一致性：requests 应该等于 success + fail
  if (requests !== success + fail) {
    console.warn(
      `⚠️ 数据不一致警告: ${name} - requests=${requests}, success=${success}, fail=${fail}`,
    );
  }
  const http200 = statusRecords.filter((s) => s === 200).length;
  const non200 = statusRecords.length - http200;

  // 响应时间统计
  const avgMs = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  const sorted = [...durations].sort((a, b) => a - b);
  const p95Index = sorted.length ? Math.floor(0.95 * (sorted.length - 1)) : 0;
  const p99Index = sorted.length ? Math.floor(0.99 * (sorted.length - 1)) : 0;
  const p95Ms = sorted.length ? sorted[p95Index] : 0;
  const p99Ms = sorted.length ? sorted[p99Index] : 0;
  const minMs = sorted.length ? sorted[0] : 0;
  const maxMs = sorted.length ? sorted[sorted.length - 1] : 0;

  // 性能指标计算
  const qps =
    testDurationSeconds > 0
      ? Number((requests / testDurationSeconds).toFixed(2))
      : 0;
  const tps =
    testDurationSeconds > 0
      ? Number((success / testDurationSeconds).toFixed(2))
      : 0;
  const errorRate =
    requests > 0 ? Number(((fail / requests) * 100).toFixed(2)) : 0;
  const successRate =
    requests > 0 ? Number(((success / requests) * 100).toFixed(2)) : 0;

  return {
    name,
    method,
    path,
    requests,
    success,
    fail,
    http200,
    non200,
    avgMs,
    p95Ms,
    p99Ms,
    minMs,
    maxMs,
    lastError,
    lastErrorParams,
    codeCounts,
    qps,
    tps,
    errorRate,
    successRate,
  };
}

/**
 * 重复执行单个任务并收集统计数据
 * 根据任务类型（普通任务、复合任务、自定义执行器）执行相应逻辑
 * @param task 要执行的压测任务
 * @param token JWT认证令牌
 * @param times 执行次数
 * @returns 该任务的压测统计结果
 */
async function runTaskRepeatedly(
  task: EndpointTask,
  token: string,
  times: number,
): Promise<EndpointStats> {
  const durations: number[] = [];
  const statuses: number[] = [];
  let codeSuccess = 0;
  let codeFail = 0;
  let lastError: string | undefined;
  let lastErrorParams: any;
  const codeCounts: Record<string, number> = {};

  // 记录测试开始时间
  const testStartTime = Date.now();

  for (let i = 0; i < times; i++) {
    const start = Date.now();
    try {
      let execRes: { status: number; data: any; code?: number };

      if (task.runner) {
        // 使用自定义执行器
        execRes = await task.runner(token);
      } else if (
        task.isComposite &&
        task.name.includes('upsert+deleteEvaluationDetail')
      ) {
        // 复合操作：先 upsert 再 delete
        const { year, countryId, text, images, deletedImages } =
          task.body as any;

        // 1. upsert
        const upsertRes = await postJson(
          `${BASE_URL}/score/custom/upsertEvaluationDetail`,
          token,
          {
            year,
            countryId,
            text: `${text}-${Date.now()}-${i}`,
            images,
            deletedImages,
          },
        );

        const upsertOk =
          upsertRes.status === 200 && upsertRes.data?.code === 10000;

        let deleteRes: { status: number; data: any } | null = null;
        let deleteOk = false;
        if (upsertOk) {
          // 2. 仅当 upsert 成功后才尝试 delete，避免无意义的删除导致 20002
          deleteRes = await postJson(
            `${BASE_URL}/score/custom/deleteEvaluationDetail`,
            token,
            { year, countryId },
          );
          // 将 10000 视为成功；对于 20002（记录不存在）由于存在关联删除的情况，所以也视为“可接受”，但不计入 deleteOk
          deleteOk = deleteRes.status === 200 && deleteRes.data?.code === 10000;
        }

        // 组合结果修正：delete 返回 20002(资源不存在) 也视为可接受（目标状态为“无记录”），不算失败
        const deleteCodeVal: number | undefined = deleteRes?.data?.code;
        const deleteAcceptable = deleteOk || deleteCodeVal === 20002;
        const combinedCode =
          upsertOk && deleteAcceptable
            ? 10000
            : (deleteCodeVal ?? upsertRes.data?.code ?? 20000);

        execRes = {
          status: upsertRes.status, // 以 upsert 的 HTTP 状态为主
          data: { code: combinedCode },
          code: combinedCode,
        };

        // 记录两个操作的 code 分布
        if (upsertRes.data?.code) {
          const c = String(upsertRes.data.code);
          codeCounts[`upsert_${c}`] = (codeCounts[`upsert_${c}`] || 0) + 1;
        }
        if (deleteRes?.data?.code) {
          const c = String(deleteRes.data.code);
          codeCounts[`delete_${c}`] = (codeCounts[`delete_${c}`] || 0) + 1;
        }
      } else {
        // 普通操作
        execRes = await postJson(
          `${BASE_URL}${task.path}`,
          token,
          task.body,
          task.isFileStream,
        );
      }

      const status = execRes.status;
      const data = execRes.data;
      const elapsed = Date.now() - start;
      durations.push(elapsed);
      statuses.push(status);

      if (task.isFileStream) {
        // 文件流：HTTP 200 或 201 都认为成功（201 Created 也是成功状态）
        if (FILE_STREAM_SUCCESS_CODES.includes(status)) {
          codeSuccess++;
          codeCounts[`${status}_file`] =
            (codeCounts[`${status}_file`] || 0) + 1;
        } else {
          codeFail++;
          codeCounts[`${status}_file`] =
            (codeCounts[`${status}_file`] || 0) + 1;
          // 记录文件流错误参数
          if (ENABLE_ERROR_PARAM_LOGGING && !lastError) {
            lastError = `文件流错误: HTTP ${status}`;
            lastErrorParams = {
              task: task.name,
              path: task.path,
              method: task.method,
              body: task.body,
              attempt: i + 1,
              timestamp: new Date().toISOString(),
              response: execRes.data,
            };
          }
        }
      } else {
        if (data && typeof data.code === 'number') {
          const c = String(data.code);
          const isCompositeEval =
            task.isComposite &&
            task.name.includes('upsert+deleteEvaluationDetail');
          // 复合任务：避免在总体分布里重复累计合成后的通用code（例如10000），只保留 upsert_/delete_ 明细
          if (!isCompositeEval) {
            codeCounts[c] = (codeCounts[c] || 0) + 1;
          }
          if (status === 200 && data.code === 10000) {
            codeSuccess++;
          } else {
            codeFail++;
            // 记录业务错误参数
            if (ENABLE_ERROR_PARAM_LOGGING && !lastError) {
              if (status !== 200) {
                lastError = `HTTP错误: ${status}`;
              } else {
                lastError = `业务错误: code=${data.code}`;
              }
              lastErrorParams = {
                task: task.name,
                path: task.path,
                method: task.method,
                body: task.body,
                attempt: i + 1,
                timestamp: new Date().toISOString(),
                response: execRes.data,
              };
            }
          }
        } else {
          codeCounts.no_code = (codeCounts.no_code || 0) + 1;
          codeFail++;
          // 记录业务错误参数
          if (ENABLE_ERROR_PARAM_LOGGING && !lastError) {
            lastError = `业务错误: code=${execRes.code || 'no_code'}`;
            lastErrorParams = {
              task: task.name,
              path: task.path,
              method: task.method,
              body: task.body,
              attempt: i + 1,
              timestamp: new Date().toISOString(),
              response: execRes.data,
            };
          }
        }
      }
    } catch (e: any) {
      lastError = e?.message || String(e);
      if (ENABLE_ERROR_PARAM_LOGGING) {
        lastErrorParams = {
          task: task.name,
          path: task.path,
          method: task.method,
          body: task.body,
          attempt: i + 1,
          timestamp: new Date().toISOString(),
        };
      }
      // 确保失败分支也记录一次耗时与状态，避免 requests=0 而 fail>0
      const elapsedOnError = Date.now() - start;
      durations.push(elapsedOnError);
      statuses.push(0);

      // 记录异常错误码到 codeCounts
      if (lastError && lastError.includes('请求超时')) {
        codeCounts.timeout_error = (codeCounts.timeout_error || 0) + 1;
      } else if (
        lastError &&
        (lastError.includes('网络错误') || lastError.includes('fetch'))
      ) {
        codeCounts.network_error = (codeCounts.network_error || 0) + 1;
      } else {
        codeCounts.exception_error = (codeCounts.exception_error || 0) + 1;
      }

      codeFail++;
    }
    // 每个请求之间稍作间隔，避免单连接排队
    if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
  }
  // 计算测试持续时间
  const testDurationSeconds = (Date.now() - testStartTime) / 1000;

  const stats = computeStats(
    task.name,
    task.path,
    task.method,
    durations,
    statuses,
    codeSuccess,
    codeFail,
    lastError,
    codeCounts,
    testDurationSeconds,
    lastErrorParams,
  );

  // 保存原始耗时数据用于后续合并统计
  (stats as any)._durations = durations;

  return stats;
}

/**
 * 并发执行任务
 * 使用工作池模式控制并发数量，避免资源耗尽
 * @param items 要执行的任务数组
 * @param limit 最大并发数
 * @param runner 任务执行函数
 * @returns 所有任务的执行结果数组
 */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  runner: (item: T) => Promise<any>,
): Promise<unknown[]> {
  const results: Array<unknown> = [];
  let index = 0;
  const workers = new Array(Math.min(limit, items.length))
    .fill(0)
    .map((_, workerIndex) =>
      (async () => {
        // 并发>1时，为不同worker增加启动错峰，避免瞬时突发
        if (limit > 1 && WORKER_START_STAGGER_MS > 0) {
          await sleep(workerIndex * WORKER_START_STAGGER_MS);
        }
        while (true) {
          const current = index++;
          if (current >= items.length) break;
          const item = items[current];
          const r = await runner(item);
          results[current] = r;
          // 并发>1时，为同一worker的连续任务增加固定间隔
          if (limit > 1 && REQUEST_DELAY_MS > 0) {
            await sleep(REQUEST_DELAY_MS);
          }
        }
      })(),
    );
  await Promise.all(workers);
  // 仅作为本地聚合结果使用（类型宽松返回）
  return results;
}

/**
 * 主函数：执行压力测试
 * 1. 登录获取认证令牌
 * 2. 发现真实数据
 * 3. 构建读写接口任务
 * 4. 随机生成请求任务（模拟真实生产环境）
 * 5. 并发执行压力测试
 * 6. 生成统计报告
 */
async function main() {
  console.log('=== 压力测试配置 ===');
  console.log(`服务地址: ${BASE_URL}`);
  console.log(`并发数: ${CONCURRENCY}`);
  console.log(`每个并发通道请求次数: ${REQUESTS_PER_WORKER}`);
  console.log(`总请求数: ${CONCURRENCY * REQUESTS_PER_WORKER}`);
  console.log(`读操作占比: ${(READ_WRITE_RATIO * 100).toFixed(1)}%`);
  console.log(`写操作占比: ${((1 - READ_WRITE_RATIO) * 100).toFixed(1)}%`);
  console.log(
    `无数据依赖任务权重: ${(NO_DATA_DEPENDENCY_WEIGHT * 100).toFixed(1)}%`,
  );
  console.log(`请求间隔: ${REQUEST_DELAY_MS}ms`);
  console.log(`错误参数记录: ${ENABLE_ERROR_PARAM_LOGGING ? '启用' : '禁用'}`);
  console.log(
    `HTTP超时: ${HTTP_TIMEOUT_MS}ms； Keep-Alive: ${HTTP_KEEPALIVE ? '启用' : '禁用'}`,
  );
  if (CONCURRENCY > 1) {
    console.log(`并发错峰: ${WORKER_START_STAGGER_MS}ms`);
  }

  // 登录
  const token = await loginAndGetToken();
  console.log('✅ 登录成功，获取到访问令牌');

  // 发现真实数据
  const discovered = await discoverRealData(token);

  // 构建读写端点并混合执行
  const readEndpoints = buildEndpointTasks(token, discovered);
  const { tasks: writeEndpoints } = buildWriteEndpointTasks(discovered);
  const allEndpoints: EndpointTask[] = [...readEndpoints, ...writeEndpoints];

  console.log(`\n=== 接口发现结果 ===`);
  console.log(`📊 发现 ${allEndpoints.length} 个可用端点`);
  console.log(`📖 读接口: ${readEndpoints.length} 个`);
  console.log(`✏️  写接口: ${writeEndpoints.length} 个`);
  console.log(`\n=== 开始压力测试 ===`);
  console.log(`🎯 模拟真实生产环境，随机抽取接口执行`);
  console.log(`⚡ 并发数: ${CONCURRENCY}`);
  console.log(`🔄 总请求数: ${CONCURRENCY * REQUESTS_PER_WORKER}`);

  // 模拟真实生产环境：智能随机抽取接口执行
  // 避免操作不存在数据的情况，确保每个请求都有有效的数据支撑
  const totalRequests = CONCURRENCY * REQUESTS_PER_WORKER;
  const randomEndpoints: EndpointTask[] = [];

  // 分类任务：有数据依赖的和无数据依赖的
  const tasksWithDataDependency = allEndpoints.filter((task) => {
    // 检查任务是否有数据依赖（需要特定的ID、年份等）
    return (
      task.name.includes('detail') ||
      task.name.includes('getDetailsByIds') ||
      task.name.includes('checkExisting') ||
      task.name.includes('batchCheck') ||
      task.name.includes('getEvaluationDetail') ||
      task.name.includes('exportMultiYear')
    );
  });

  const tasksWithoutDataDependency = allEndpoints.filter(
    (task) => !tasksWithDataDependency.includes(task),
  );

  console.log(`📊 任务分类统计:`);
  console.log(`   - 有数据依赖的任务: ${tasksWithDataDependency.length} 个`);
  console.log(`   - 无数据依赖的任务: ${tasksWithoutDataDependency.length} 个`);

  // 智能随机抽取：根据配置的读写比例和数据依赖权重选择任务
  // 同时避免写操作的数据冲突问题
  for (let i = 0; i < totalRequests; i++) {
    let selectedTask: EndpointTask;

    // 首先根据读写比例选择操作类型
    const isReadOperation = Math.random() < READ_WRITE_RATIO;

    if (isReadOperation) {
      // 读操作：优先选择无数据依赖的任务
      if (
        Math.random() < NO_DATA_DEPENDENCY_WEIGHT &&
        tasksWithoutDataDependency.length > 0
      ) {
        const readTasksWithoutDependency = tasksWithoutDataDependency.filter(
          (task) => task.op === 'read',
        );
        if (readTasksWithoutDependency.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * readTasksWithoutDependency.length,
          );
          selectedTask = readTasksWithoutDependency[randomIndex];
        } else {
          // 如果没有无数据依赖的读任务，从所有读任务中选择
          const allReadTasks = allEndpoints.filter(
            (task) => task.op === 'read',
          );
          const randomIndex = Math.floor(Math.random() * allReadTasks.length);
          selectedTask = allReadTasks[randomIndex];
        }
      } else {
        // 选择有数据依赖的读任务
        const readTasksWithDependency = tasksWithDataDependency.filter(
          (task) => task.op === 'read',
        );
        if (readTasksWithDependency.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * readTasksWithDependency.length,
          );
          selectedTask = readTasksWithDependency[randomIndex];
        } else {
          // 如果没有有数据依赖的读任务，从所有读任务中选择
          const allReadTasks = allEndpoints.filter(
            (task) => task.op === 'read',
          );
          const randomIndex = Math.floor(Math.random() * allReadTasks.length);
          selectedTask = allReadTasks[randomIndex];
        }
      }
    } else {
      // 写操作：优先选择无数据依赖的任务
      if (
        Math.random() < NO_DATA_DEPENDENCY_WEIGHT &&
        tasksWithoutDataDependency.length > 0
      ) {
        const writeTasksWithoutDependency = tasksWithoutDataDependency.filter(
          (task) => task.op === 'write',
        );
        if (writeTasksWithoutDependency.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * writeTasksWithoutDependency.length,
          );
          selectedTask = writeTasksWithoutDependency[randomIndex];
        } else {
          // 如果没有无数据依赖的写任务，从所有写任务中选择
          const allWriteTasks = allEndpoints.filter(
            (task) => task.op === 'write',
          );
          const randomIndex = Math.floor(Math.random() * allWriteTasks.length);
          selectedTask = allWriteTasks[randomIndex];
        }
      } else {
        // 选择有数据依赖的写任务
        const writeTasksWithDependency = tasksWithDataDependency.filter(
          (task) => task.op === 'write',
        );
        if (writeTasksWithDependency.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * writeTasksWithDependency.length,
          );
          selectedTask = writeTasksWithDependency[randomIndex];
        } else {
          // 如果没有有数据依赖的写任务，从所有写任务中选择
          const allWriteTasks = allEndpoints.filter(
            (task) => task.op === 'write',
          );
          const randomIndex = Math.floor(Math.random() * allWriteTasks.length);
          selectedTask = allWriteTasks[randomIndex];
        }
      }
    }

    // 如果上面的逻辑没有找到合适的任务，从所有任务中随机选择
    if (!selectedTask) {
      const randomIndex = Math.floor(Math.random() * allEndpoints.length);
      selectedTask = allEndpoints[randomIndex];
    }

    // 对于写操作，动态生成唯一的数据以避免冲突
    if (selectedTask.op === 'write') {
      selectedTask = generateUniqueWriteTask(selectedTask, i);
    }

    randomEndpoints.push(selectedTask);
  }

  // 统计实际生成的读写任务比例
  const actualReadTasks = randomEndpoints.filter(
    (task) => task.op === 'read',
  ).length;
  const actualWriteTasks = randomEndpoints.filter(
    (task) => task.op === 'write',
  ).length;
  const actualReadRatio = ((actualReadTasks / totalRequests) * 100).toFixed(1);
  const actualWriteRatio = ((actualWriteTasks / totalRequests) * 100).toFixed(
    1,
  );

  console.log(`\n🚀 生成了 ${totalRequests} 个随机请求任务，开始执行...`);
  console.log(`📊 实际任务分布:`);
  console.log(`   - 读任务: ${actualReadTasks} 个 (${actualReadRatio}%)`);
  console.log(`   - 写任务: ${actualWriteTasks} 个 (${actualWriteRatio}%)`);
  console.log('⏳ 正在执行压力测试，请稍候...');

  // 记录压测开始时间
  (global as any)._testStartTime = Date.now();

  // 执行随机请求
  const stats = await runWithConcurrency(
    randomEndpoints,
    CONCURRENCY,
    (task) => runTaskRepeatedly(task, token, 1), // 每个任务只执行1次，因为我们已经随机生成了足够的请求
  );

  console.log('✅ 压力测试执行完成，正在生成报告...');

  // 汇总输出（中文报告）
  const table = stats as EndpointStats[];

  // 合并同一个端点的多次调用结果
  const mergeEndpointStats = (stats: EndpointStats[]): EndpointStats[] => {
    const endpointMap = new Map<string, EndpointStats>();

    stats.forEach((stat, index) => {
      const task = randomEndpoints[index];
      if (!task) return;

      const endpointKey = `${task.method} ${task.path}`;

      if (endpointMap.has(endpointKey)) {
        // 合并已存在的端点统计
        const existing = endpointMap.get(endpointKey)!;
        existing.requests += stat.requests;
        existing.success += stat.success;
        existing.fail += stat.fail;
        existing.http200 += stat.http200;
        existing.non200 += stat.non200;

        // 合并业务code分布
        Object.entries(stat.codeCounts).forEach(([code, count]) => {
          existing.codeCounts[code] = (existing.codeCounts[code] || 0) + count;
        });

        // 合并耗时数据并重新计算所有响应时间指标
        const allDurations = [
          ...((existing as any)._durations || []),
          ...((stat as any)._durations || []),
        ];
        existing.avgMs =
          allDurations.length > 0
            ? Math.round(
                allDurations.reduce((a: number, b: number) => a + b, 0) /
                  allDurations.length,
              )
            : 0;

        const sorted = [...allDurations].sort((a: number, b: number) => a - b);
        const p95Index = sorted.length
          ? Math.floor(0.95 * (sorted.length - 1))
          : 0;
        const p99Index = sorted.length
          ? Math.floor(0.99 * (sorted.length - 1))
          : 0;
        existing.p95Ms = sorted.length ? sorted[p95Index] : 0;
        existing.p99Ms = sorted.length ? sorted[p99Index] : 0;
        existing.minMs = sorted.length ? sorted[0] : 0;
        existing.maxMs = sorted.length ? sorted[sorted.length - 1] : 0;

        // 重新计算性能指标（基于总的压测时间）
        const totalTestDurationSeconds =
          (Date.now() - (global as any)._testStartTime) / 1000;
        existing.qps =
          totalTestDurationSeconds > 0
            ? Number((existing.requests / totalTestDurationSeconds).toFixed(2))
            : 0;
        existing.tps =
          totalTestDurationSeconds > 0
            ? Number((existing.success / totalTestDurationSeconds).toFixed(2))
            : 0;
        // 确保成功率和错误率的一致性：success + fail = requests
        const totalRequests = existing.success + existing.fail;
        if (totalRequests > 0) {
          existing.errorRate = Number(
            ((existing.fail / totalRequests) * 100).toFixed(2),
          );
          existing.successRate = Number(
            ((existing.success / totalRequests) * 100).toFixed(2),
          );
        } else {
          existing.errorRate = 0;
          existing.successRate = 0;
        }

        // 保留最新的错误信息（如果有的话）
        if (stat.lastError && !existing.lastError) {
          existing.lastError = stat.lastError;
          existing.lastErrorParams = stat.lastErrorParams;
        }

        // 保存合并后的耗时数据用于后续计算
        (existing as any)._durations = allDurations;
      } else {
        // 新增端点统计
        const mergedStat = { ...stat };
        (mergedStat as any)._durations = [...((stat as any)._durations || [])];
        endpointMap.set(endpointKey, mergedStat);
      }
    });

    return Array.from(endpointMap.values());
  };

  const mergedStats = mergeEndpointStats(table);

  const toRow = (s: EndpointStats) => {
    return {
      端点: `${s.method} ${s.path}`,
      成功数: s.success,
      失败数: s.fail,
      P95耗时ms: s.p95Ms,
      P99耗时ms: s.p99Ms,
      业务code分布: JSON.stringify(s.codeCounts),
      最后错误: s.lastError || '无',
    };
  };

  // 根据合并后的统计进行分类
  const readRows = mergedStats
    .filter((s) => {
      const endpointKey = `${s.method} ${s.path}`;
      const originalTask = allEndpoints.find(
        (task) => `${task.method} ${task.path}` === endpointKey,
      );
      return originalTask && originalTask.op === 'read';
    })
    .map(toRow);

  const writeRows = mergedStats
    .filter((s) => {
      const endpointKey = `${s.method} ${s.path}`;
      const originalTask = allEndpoints.find(
        (task) => `${task.method} ${task.path}` === endpointKey,
      );
      return originalTask && originalTask.op === 'write';
    })
    .map(toRow);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr: number[]) => (arr.length > 0 ? sum(arr) / arr.length : 0);

  // 计算总体性能指标
  const allDurations: number[] = mergedStats.flatMap((s) => {
    const durations = (s as any)._durations;
    return Array.isArray(durations) ? (durations as number[]) : [];
  });

  // 计算总的压测执行时间（从第一个请求开始到最后一个请求结束）
  const totalTestDurationSeconds =
    (Date.now() - (global as any)._testStartTime) / 1000;

  const overall = {
    totalRequests: sum(mergedStats.map((s) => s.success + s.fail)),
    totalSuccess: sum(mergedStats.map((s) => s.success)),
    totalFail: sum(mergedStats.map((s) => s.fail)),
    avgResponseTime: Math.round(avg(allDurations)),
    p95ResponseTime:
      allDurations.length > 0
        ? allDurations.sort((a, b) => a - b)[
            Math.floor(0.95 * (allDurations.length - 1))
          ]
        : 0,
    p99ResponseTime:
      allDurations.length > 0
        ? allDurations.sort((a, b) => a - b)[
            Math.floor(0.99 * (allDurations.length - 1))
          ]
        : 0,
    minResponseTime: allDurations.length > 0 ? Math.min(...allDurations) : 0,
    maxResponseTime: allDurations.length > 0 ? Math.max(...allDurations) : 0,
    totalQPS:
      totalTestDurationSeconds > 0
        ? Number(
            (
              sum(mergedStats.map((s) => s.success + s.fail)) /
              totalTestDurationSeconds
            ).toFixed(2),
          )
        : 0,
    totalTPS:
      totalTestDurationSeconds > 0
        ? Number(
            (
              sum(mergedStats.map((s) => s.success)) / totalTestDurationSeconds
            ).toFixed(2),
          )
        : 0,
  };

  const readAgg = {
    totalRequests: sum(
      mergedStats
        .filter((s) => {
          const endpointKey = `${s.method} ${s.path}`;
          const originalTask = allEndpoints.find(
            (task) => `${task.method} ${task.path}` === endpointKey,
          );
          return originalTask && originalTask.op === 'read';
        })
        .map((s) => s.success + s.fail),
    ),
    totalSuccess: sum(readRows.map((s) => s.成功数)),
    totalFail: sum(readRows.map((s) => s.失败数)),
    avgResponseTime: Math.round(
      avg(
        mergedStats
          .filter((s) => {
            const endpointKey = `${s.method} ${s.path}`;
            const originalTask = allEndpoints.find(
              (task) => `${task.method} ${task.path}` === endpointKey,
            );
            return originalTask && originalTask.op === 'read';
          })
          .map((s) => s.avgMs),
      ),
    ),
    p95ResponseTime: Math.round(avg(readRows.map((s) => s.P95耗时ms))),
    p99ResponseTime: Math.round(avg(readRows.map((s) => s.P99耗时ms))),
    totalQPS:
      totalTestDurationSeconds > 0
        ? Number(
            (
              sum(
                mergedStats
                  .filter((s) => {
                    const endpointKey = `${s.method} ${s.path}`;
                    const originalTask = allEndpoints.find(
                      (task) => `${task.method} ${task.path}` === endpointKey,
                    );
                    return originalTask && originalTask.op === 'read';
                  })
                  .map((s) => s.success + s.fail),
              ) / totalTestDurationSeconds
            ).toFixed(2),
          )
        : 0,
    totalTPS:
      totalTestDurationSeconds > 0
        ? Number(
            (
              sum(
                mergedStats
                  .filter((s) => {
                    const endpointKey = `${s.method} ${s.path}`;
                    const originalTask = allEndpoints.find(
                      (task) => `${task.method} ${task.path}` === endpointKey,
                    );
                    return originalTask && originalTask.op === 'read';
                  })
                  .map((s) => s.success),
              ) / totalTestDurationSeconds
            ).toFixed(2),
          )
        : 0,
  };

  const writeAgg = {
    totalRequests: sum(
      mergedStats
        .filter((s) => {
          const endpointKey = `${s.method} ${s.path}`;
          const originalTask = allEndpoints.find(
            (task) => `${task.method} ${task.path}` === endpointKey,
          );
          return originalTask && originalTask.op === 'write';
        })
        .map((s) => s.success + s.fail),
    ),
    totalSuccess: sum(writeRows.map((s) => s.成功数)),
    totalFail: sum(writeRows.map((s) => s.失败数)),
    avgResponseTime: Math.round(
      avg(
        mergedStats
          .filter((s) => {
            const endpointKey = `${s.method} ${s.path}`;
            const originalTask = allEndpoints.find(
              (task) => `${task.method} ${task.path}` === endpointKey,
            );
            return originalTask && originalTask.op === 'write';
          })
          .map((s) => s.avgMs),
      ),
    ),
    p95ResponseTime: Math.round(avg(writeRows.map((s) => s.P95耗时ms))),
    p99ResponseTime: Math.round(avg(writeRows.map((s) => s.P99耗时ms))),
    totalQPS:
      totalTestDurationSeconds > 0
        ? Number(
            (
              sum(
                mergedStats
                  .filter((s) => {
                    const endpointKey = `${s.method} ${s.path}`;
                    const originalTask = allEndpoints.find(
                      (task) => `${task.method} ${task.path}` === endpointKey,
                    );
                    return originalTask && originalTask.op === 'write';
                  })
                  .map((s) => s.success + s.fail),
              ) / totalTestDurationSeconds
            ).toFixed(2),
          )
        : 0,
    totalTPS:
      totalTestDurationSeconds > 0
        ? Number(
            (
              sum(
                mergedStats
                  .filter((s) => {
                    const endpointKey = `${s.method} ${s.path}`;
                    const originalTask = allEndpoints.find(
                      (task) => `${task.method} ${task.path}` === endpointKey,
                    );
                    return originalTask && originalTask.op === 'write';
                  })
                  .map((s) => s.success),
              ) / totalTestDurationSeconds
            ).toFixed(2),
          )
        : 0,
  };

  console.log('\n========= 📖 读接口统计 =========');
  console.log(`📈 读请求数: ${readAgg.totalRequests}`);
  console.log(`✅ 读成功数: ${readAgg.totalSuccess}`);
  console.log(`❌ 读失败数: ${readAgg.totalFail}`);
  console.log(
    `📊 读成功率: ${((readAgg.totalSuccess / Math.max(1, readAgg.totalRequests)) * 100).toFixed(2)}%`,
  );
  console.log(`⚡ 读QPS: ${readAgg.totalQPS.toFixed(2)}`);
  console.log(`🎯 读TPS: ${readAgg.totalTPS.toFixed(2)}`);
  console.log(`⏱️ 读平均响应时间: ${readAgg.avgResponseTime}ms`);
  console.log(`📊 读P95响应时间: ${readAgg.p95ResponseTime}ms`);
  console.log(`📊 读P99响应时间: ${readAgg.p99ResponseTime}ms`);
  if (readRows.length > 0) console.table(readRows);

  console.log('\n========= ✏️ 写接口统计 =========');
  console.log(`📈 写请求数: ${writeAgg.totalRequests}`);
  console.log(`✅ 写成功数: ${writeAgg.totalSuccess}`);
  console.log(`❌ 写失败数: ${writeAgg.totalFail}`);
  console.log(
    `📊 写成功率: ${((writeAgg.totalSuccess / Math.max(1, writeAgg.totalRequests)) * 100).toFixed(2)}%`,
  );
  console.log(`⚡ 写QPS: ${writeAgg.totalQPS.toFixed(2)}`);
  console.log(`🎯 写TPS: ${writeAgg.totalTPS.toFixed(2)}`);
  console.log(`⏱️ 写平均响应时间: ${writeAgg.avgResponseTime}ms`);
  console.log(`📊 写P95响应时间: ${writeAgg.p95ResponseTime}ms`);
  console.log(`📊 写P99响应时间: ${writeAgg.p99ResponseTime}ms`);
  if (writeRows.length > 0) console.table(writeRows);

  console.log('\n========= 📊 压力测试结果汇总 =========');
  console.log(`📈 总请求数: ${overall.totalRequests}`);
  console.log(`✅ 成功请求: ${overall.totalSuccess}`);
  console.log(`❌ 失败请求: ${overall.totalFail}`);
  console.log(
    `📊 整体成功率: ${((overall.totalSuccess / Math.max(1, overall.totalRequests)) * 100).toFixed(2)}%`,
  );
  console.log(`⏱️ 压测执行时间: ${totalTestDurationSeconds.toFixed(2)}秒`);
  console.log(`🔄 并发数: ${CONCURRENCY}`);
  console.log(`⚡ 总QPS: ${overall.totalQPS.toFixed(2)}`);
  console.log(`🎯 总TPS: ${overall.totalTPS.toFixed(2)}`);
  console.log(`⏱️ 平均响应时间: ${overall.avgResponseTime}ms`);
  console.log(`📊 P95响应时间: ${overall.p95ResponseTime}ms`);
  console.log(`📊 P99响应时间: ${overall.p99ResponseTime}ms`);
  console.log(`📊 最小响应时间: ${overall.minResponseTime}ms`);
  console.log(`📊 最大响应时间: ${overall.maxResponseTime}ms`);

  // 错误参数报告（用于复现问题）
  if (ENABLE_ERROR_PARAM_LOGGING) {
    const errorStats = mergedStats.filter(
      (s) => s.lastError && s.lastErrorParams,
    );
    if (errorStats.length > 0) {
      console.log('\n========= 🐛 错误参数记录（用于复现问题） =========');
      errorStats.forEach((stat, index) => {
        console.log(`\n${index + 1}. 端点: ${stat.method} ${stat.path}`);
        console.log(`   错误信息: ${stat.lastError}`);
        console.log(`   错误参数:`);
        console.log(`     - 任务名称: ${stat.lastErrorParams?.task}`);
        console.log(`     - 请求路径: ${stat.lastErrorParams?.path}`);
        console.log(`     - 请求方法: ${stat.lastErrorParams?.method}`);
        console.log(
          `     - 请求体: ${JSON.stringify(stat.lastErrorParams?.body, null, 2)}`,
        );
        console.log(`     - 尝试次数: ${stat.lastErrorParams?.attempt}`);
        console.log(`     - 错误时间: ${stat.lastErrorParams?.timestamp}`);
        console.log(`   ---`);
      });
      console.log('\n💡 提示: 可以使用上述参数手动复现错误');
    } else {
      console.log('\n✅ 本次压测未发现错误，无需记录错误参数');
    }
  }
}

main().catch((e) => {
  console.error('❌ 压力测试脚本执行异常：', e);
  process.exit(1);
});

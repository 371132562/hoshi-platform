import * as xlsx from 'xlsx';
import { ExportFormat } from '../../../types/dto';
import dayjs from './date-time.utils';

/**
 * 导出数据行类型
 */
export type ExportDataRow = (string | number | null)[];

/**
 * 导出表头类型
 */
export type ExportHeader = string[];

/**
 * 通用的“分组-条目ID列表”结构
 * 通过传入的分组键 GroupT 与条目ID类型 IdT，组织导出要处理的数据边界
 */
export type KeyIdsPair<GroupT, IdT> = {
  group: GroupT;
  ids: IdT[];
};

/**
 * 导出文件结果类型
 */
export type ExportFileResult = {
  buffer: Buffer;
  mime: string;
  fileName: string;
};

/**
 * 数据行构建函数类型
 */
/**
 * 通用数据行构建器
 * - item: 条目实体（由调用方提供的任意类型）
 * - group: 分组键（如年份、批次、部门等，类型由调用方定义）
 * - data: 与条目+分组关联的数据（类型由调用方定义）
 */
export type DataRowBuilder<DataT, ItemT, GroupT> = (
  item: ItemT,
  group: GroupT,
  data: DataT | undefined,
) => ExportDataRow;

/**
 * 导出工具类
 * 提供通用的文件导出功能，支持 CSV、Excel、JSON 三种格式
 */
export class ExportUtils {
  /**
   * 生成导出文件（统一入口，完全泛型化）
   * @param pairs 分组-条目ID对数组（完全泛型，可表示“年份-国家ID”、“批次-用户ID”等）
   * @param itemMap 条目实体映射 Map<条目ID, 条目实体>
   * @param header 表头数组
   * @param dataRowBuilder 数据行构建函数（由调用方提供）
   * @param dataMap 数据映射 Map<复合键, DataT>
   * @param format 文件格式
   * @param fileNamePrefix 文件名前缀
   * @param options 可选项：logger、composeDataKey(group, id) 拼接数据键、groupLabel(group) 生成分组标签
   * @returns 导出文件结果
   */
  static generateExportFile<DataT, ItemT, GroupT>(
    pairs: KeyIdsPair<GroupT, string>[],
    itemMap: Map<string, ItemT>,
    header: ExportHeader,
    dataRowBuilder: DataRowBuilder<DataT, ItemT, GroupT>,
    dataMap: Map<string, DataT>,
    format: ExportFormat,
    fileNamePrefix: string,
    options?: {
      logger?: {
        log: (message: string) => void;
        warn: (message: string) => void;
      };
      composeDataKey?: (group: GroupT, id: string) => string;
      groupLabel?: (group: GroupT) => string;
      csvSingleGroupOnly?: boolean; // 默认 true：CSV 仅导出第一个分组
    },
  ): ExportFileResult {
    const timestamp = dayjs().format('YYYY_MM_DD_HH_mm_ss');
    const composeDataKey =
      options?.composeDataKey ??
      ((group: GroupT, id: string) => `${String(group)}-${id}`);
    const groupLabel =
      options?.groupLabel ?? ((group: GroupT) => String(group));

    const logger = options?.logger;
    const csvSingleGroupOnly = options?.csvSingleGroupOnly ?? true;

    if (format === ExportFormat.JSON) {
      return this._generateJsonFile(
        pairs,
        itemMap,
        header,
        dataRowBuilder,
        dataMap,
        fileNamePrefix,
        timestamp,
        composeDataKey,
        groupLabel,
      );
    } else if (format === ExportFormat.CSV) {
      return this._generateCsvFile(
        pairs,
        itemMap,
        header,
        dataRowBuilder,
        dataMap,
        fileNamePrefix,
        timestamp,
        logger,
        composeDataKey,
        groupLabel,
        csvSingleGroupOnly,
      );
    } else {
      return this._generateExcelFile(
        pairs,
        itemMap,
        header,
        dataRowBuilder,
        dataMap,
        fileNamePrefix,
        timestamp,
        composeDataKey,
        groupLabel,
      );
    }
  }

  /**
   * 生成JSON格式文件
   * @private
   */
  private static _generateJsonFile<DataT, ItemT, GroupT>(
    pairs: KeyIdsPair<GroupT, string>[],
    itemMap: Map<string, ItemT>,
    header: ExportHeader,
    dataRowBuilder: DataRowBuilder<DataT, ItemT, GroupT>,
    dataMap: Map<string, DataT>,
    fileNamePrefix: string,
    timestamp: string,
    composeDataKey: (group: GroupT, id: string) => string,
    groupLabel: (group: GroupT) => string,
  ): ExportFileResult {
    const jsonData: { [key: string]: any[] } = {};

    pairs.forEach(({ group, ids }) => {
      const currentGroupData: any[] = [];

      ids.forEach((id) => {
        const item = itemMap.get(id);
        if (!item) return;

        const dataKey = composeDataKey(group, id);
        const data = dataMap.get(dataKey);
        const row = dataRowBuilder(item, group, data);

        // 将行数据转换为对象格式
        const rowObject: { [key: string]: any } = {};
        header.forEach((colName, index) => {
          rowObject[colName] = row[index] || null;
        });

        currentGroupData.push(rowObject);
      });

      jsonData[groupLabel(group)] = currentGroupData;
    });

    const buffer = Buffer.from(JSON.stringify(jsonData, null, 2));
    const mime = 'application/json';
    const fileName = `导出_${fileNamePrefix}_${timestamp}.json`;

    return { buffer, mime, fileName };
  }

  /**
   * 生成CSV格式文件
   * @private
   */
  private static _generateCsvFile<DataT, ItemT, GroupT>(
    pairs: KeyIdsPair<GroupT, string>[],
    itemMap: Map<string, ItemT>,
    header: ExportHeader,
    dataRowBuilder: DataRowBuilder<DataT, ItemT, GroupT>,
    dataMap: Map<string, DataT>,
    fileNamePrefix: string,
    timestamp: string,
    logger:
      | {
          log: (message: string) => void;
          warn: (message: string) => void;
        }
      | undefined,
    composeDataKey: (group: GroupT, id: string) => string,
    groupLabel: (group: GroupT) => string,
    singleGroupOnly: boolean,
  ): ExportFileResult {
    // CSV 通常仅导出单个分组，若提供多个分组则仅导出第一个（可通过 singleGroupOnly=false 覆盖行为）
    if (singleGroupOnly && pairs.length > 1) {
      logger?.warn('[警告] CSV格式不支持多分组，只导出第一个分组的数据');
    }

    const { group, ids } = pairs[0];
    const fileName = `${groupLabel(group)}_${fileNamePrefix}_${timestamp}.csv`;

    // 构建数据行
    const dataRows: ExportDataRow[] = [];
    ids.forEach((id) => {
      const item = itemMap.get(id);
      if (!item) return;

      const dataKey = composeDataKey(group, id);
      const data = dataMap.get(dataKey);
      const row = dataRowBuilder(item, group, data);
      dataRows.push(row);
    });

    // 生成CSV内容
    const worksheet = xlsx.utils.aoa_to_sheet([header, ...dataRows]);
    const csvOutput = xlsx.utils.sheet_to_csv(worksheet);

    // 添加BOM以防止Excel打开CSV时中文乱码
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const buffer = Buffer.concat([bom, Buffer.from(csvOutput)]);
    const mime = 'text/csv;charset=utf-8;';

    return { buffer, mime, fileName };
  }

  /**
   * 生成Excel格式文件
   * @private
   */
  private static _generateExcelFile<DataT, ItemT, GroupT>(
    pairs: KeyIdsPair<GroupT, string>[],
    itemMap: Map<string, ItemT>,
    header: ExportHeader,
    dataRowBuilder: DataRowBuilder<DataT, ItemT, GroupT>,
    dataMap: Map<string, DataT>,
    fileNamePrefix: string,
    timestamp: string,
    composeDataKey: (group: GroupT, id: string) => string,
    groupLabel: (group: GroupT) => string,
  ): ExportFileResult {
    const fileName = `${fileNamePrefix}_${timestamp}.xlsx`;

    // 创建新的工作簿
    const workbook = xlsx.utils.book_new();

    // 为每个分组创建工作表
    pairs.forEach(({ group, ids }) => {
      // 构建数据行
      const dataRows: ExportDataRow[] = [];
      ids.forEach((id) => {
        const item = itemMap.get(id);
        if (!item) return;

        const dataKey = composeDataKey(group, id);
        const data = dataMap.get(dataKey);
        const row = dataRowBuilder(item, group, data);
        dataRows.push(row);
      });

      // 创建工作表
      const worksheet = xlsx.utils.aoa_to_sheet([header, ...dataRows]);
      const sheetName = groupLabel(group);
      xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // 生成文件
    const buffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;

    const mime =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return { buffer, mime, fileName };
  }

  /**
   * 通用映射构建：根据 getId 函数将条目数组构建为 Map<id, item>
   */
  static buildItemMap<ItemT>(
    items: ItemT[],
    getId: (item: ItemT) => string,
  ): Map<string, ItemT> {
    return new Map(items.map((it) => [getId(it), it]));
  }
}

/*
 * ==================== 使用示例 ====================
 *
 * 以下示例展示如何使用完全泛型化的导出工具处理不同类型的数据
 */

/**
 * 示例1：导出用户数据（按部门分组）
 */
export function exportUsersByDepartment() {
  // 定义数据类型
  type User = { id: string; name: string; department: string; email: string };
  type UserScore = { userId: string; score: number; level: string };

  // 模拟数据
  const users: User[] = [
    {
      id: 'u1',
      name: '张三',
      department: '技术部',
      email: 'zhang@example.com',
    },
    {
      id: 'u2',
      name: '李四',
      department: '技术部',
      email: 'li@example.com',
    },
    {
      id: 'u3',
      name: '王五',
      department: '销售部',
      email: 'wang@example.com',
    },
  ];

  const userScores: UserScore[] = [
    { userId: 'u1', score: 85, level: '优秀' },
    { userId: 'u2', score: 78, level: '良好' },
    { userId: 'u3', score: 92, level: '优秀' },
  ];

  // 构建映射
  const userMap = ExportUtils.buildItemMap(users, (u) => u.id);
  const scoreMap = new Map(userScores.map((s) => [`${s.userId}`, s]));

  // 定义分组-用户ID对
  const pairs: KeyIdsPair<string, string>[] = [
    { group: '技术部', ids: ['u1', 'u2'] },
    { group: '销售部', ids: ['u3'] },
  ];

  // 导出CSV
  const result = ExportUtils.generateExportFile<UserScore, User, string>(
    pairs,
    userMap,
    ['姓名', '部门', '邮箱', '分数', '等级'],
    (user, department, score) => [
      user.name,
      department,
      user.email,
      score?.score ?? 0,
      score?.level ?? '未评分',
    ],
    scoreMap,
    ExportFormat.CSV,
    '用户评分报告',
    {
      composeDataKey: (dept, userId) => userId, // 直接使用userId作为数据键
      groupLabel: (dept) => `${dept}员工`,
    },
  );

  return result;
}

/**
 * 示例2：导出产品数据（按年份分组）
 */
export function exportProductsByYear() {
  // 定义数据类型
  type Product = { id: string; name: string; category: string; price: number };
  type SalesData = {
    productId: string;
    year: number;
    sales: number;
    profit: number;
  };

  // 模拟数据
  const products: Product[] = [
    { id: 'p1', name: '手机', category: '电子产品', price: 3000 },
    { id: 'p2', name: '电脑', category: '电子产品', price: 8000 },
    { id: 'p3', name: '书籍', category: '文化用品', price: 50 },
  ];

  const salesData: SalesData[] = [
    { productId: 'p1', year: 2023, sales: 1000, profit: 500000 },
    { productId: 'p2', year: 2023, sales: 200, profit: 400000 },
    { productId: 'p3', year: 2023, sales: 5000, profit: 100000 },
  ];

  // 构建映射
  const productMap = ExportUtils.buildItemMap(products, (p) => p.id);
  const salesMap = new Map(
    salesData.map((s) => [`${s.year}-${s.productId}`, s]),
  );

  // 定义年份-产品ID对
  const pairs: KeyIdsPair<number, string>[] = [
    { group: 2023, ids: ['p1', 'p2', 'p3'] },
  ];

  // 导出Excel（多工作表）
  const result = ExportUtils.generateExportFile<SalesData, Product, number>(
    pairs,
    productMap,
    ['产品名称', '类别', '单价', '销量', '销售额', '利润'],
    (product, year, sales) => [
      product.name,
      product.category,
      product.price,
      sales?.sales ?? 0,
      (sales?.sales ?? 0) * product.price,
      sales?.profit ?? 0,
    ],
    salesMap,
    ExportFormat.XLSX,
    '产品销售报告',
    {
      composeDataKey: (year, productId) => `${year}-${productId}`,
      groupLabel: (year) => `${year}年销售数据`,
    },
  );

  return result;
}

/**
 * 示例3：导出JSON格式的复杂数据
 */
export function exportComplexDataAsJson() {
  // 定义复杂数据类型
  type Company = {
    id: string;
    name: string;
    industry: string;
    employees: number;
  };
  type FinancialData = {
    companyId: string;
    quarter: string;
    revenue: number;
    profit: number;
    growth: number;
  };

  // 模拟数据
  const companies: Company[] = [
    { id: 'c1', name: '科技公司A', industry: 'IT', employees: 500 },
    { id: 'c2', name: '制造公司B', industry: '制造业', employees: 200 },
  ];

  const financialData: FinancialData[] = [
    {
      companyId: 'c1',
      quarter: 'Q1',
      revenue: 1000000,
      profit: 200000,
      growth: 15,
    },
    {
      companyId: 'c1',
      quarter: 'Q2',
      revenue: 1200000,
      profit: 250000,
      growth: 20,
    },
    {
      companyId: 'c2',
      quarter: 'Q1',
      revenue: 800000,
      profit: 100000,
      growth: 5,
    },
    {
      companyId: 'c2',
      quarter: 'Q2',
      revenue: 850000,
      profit: 120000,
      growth: 8,
    },
  ];

  // 构建映射
  const companyMap = ExportUtils.buildItemMap(companies, (c) => c.id);
  const financialMap = new Map(
    financialData.map((f) => [`${f.companyId}-${f.quarter}`, f]),
  );

  // 按季度分组
  const pairs: KeyIdsPair<string, string>[] = [
    { group: 'Q1', ids: ['c1', 'c2'] },
    { group: 'Q2', ids: ['c1', 'c2'] },
  ];

  // 导出JSON
  const result = ExportUtils.generateExportFile<FinancialData, Company, string>(
    pairs,
    companyMap,
    ['公司名称', '行业', '员工数', '季度', '收入', '利润', '增长率'],
    (company, quarter, financial) => [
      company.name,
      company.industry,
      company.employees,
      quarter,
      financial?.revenue ?? 0,
      financial?.profit ?? 0,
      financial?.growth ?? 0,
    ],
    financialMap,
    ExportFormat.JSON,
    '财务数据报告',
    {
      composeDataKey: (quarter, companyId) => `${companyId}-${quarter}`,
      groupLabel: (quarter) => `${quarter}季度财务数据`,
    },
  );

  return result;
}

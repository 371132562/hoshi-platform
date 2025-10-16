import * as xlsx from 'xlsx';

import { ExportFormat } from '../../../types/dto';
import dayjs from './date-time.utils';

/**
 * 通用单元格值类型（限制导出为文本或数字，空值使用null）
 */
export type CellValue = string | number | null;

/**
 * 列访问器类型：支持通过key访问或函数访问
 */
export type Accessor<T> = keyof T | ((row: T) => unknown);

/**
 * 通用列定义（通过列来解耦业务字段与导出结构）
 */
export type ColumnDef<T> = {
  /** 列头显示文本，建议传入字面量字符串以获得更强的类型推断 */
  header: string;
  /** 行访问器：从原始数据行提取该列对应的值 */
  accessor: Accessor<T>;
  /** 自定义格式化器：将任意值转为导出的单元格值 */
  formatter?: (value: unknown, row: T) => CellValue;
  /** 可选列宽（仅对xlsx有效） */
  width?: number;
};

/**
 * 根据列定义推导输出对象结构（键为列头文本）。
 * 若调用处使用 `as const` 声明列数组，键名将保持为字面量类型。
 */
export type OutputRecordFromColumns<C extends readonly ColumnDef<unknown>[]> = {
  [K in C[number] as K['header']]: CellValue;
};

/**
 * 单个工作表描述
 */
export type SheetSpec<T> = {
  /** 工作表名称（未传则使用默认：Sheet1/Sheet2...） */
  name?: string;
  /** 列定义 */
  columns: readonly ColumnDef<T>[];
  /** 数据行 */
  rows: readonly T[];
};

/**
 * 导出选项
 */
export type ExportOptions = {
  /** 导出格式 */
  format: ExportFormat;
  /** 文件名前缀 */
  fileNamePrefix: string;
  /** 指定时间戳（默认当前时间） */
  timestamp?: string;
  /** CSV是否添加BOM（默认true，避免Excel中文乱码） */
  csvWithBom?: boolean;
  /** JSON是否缩进美化（默认true） */
  jsonPretty?: boolean;
};

/**
 * 导出文件结果
 */
export type ExportFileResult = {
  buffer: Buffer;
  mime: string;
  fileName: string;
};

/**
 * 通用导出工具
 * - 完全基于列定义与泛型行类型，零业务耦合
 * - 支持多Sheet（xlsx/json），单Sheet（csv/xlsx/json）
 */
export class ExportUtils {
  /**
   * 导出多个工作表
   * - xlsx：多Sheet
   * - json：以对象形式输出，每个Sheet为一个键
   * - csv：仅导出第一个Sheet
   */
  static exportSheets<T>(
    sheets: readonly SheetSpec<T>[],
    options: ExportOptions,
  ): ExportFileResult {
    const timestamp =
      options.timestamp ?? dayjs().format('YYYY_MM_DD_HH_mm_ss');

    if (options.format === ExportFormat.JSON) {
      return this.generateJson(
        sheets,
        options.fileNamePrefix,
        timestamp,
        options.jsonPretty !== false,
      );
    }
    if (options.format === ExportFormat.CSV) {
      // CSV仅导出第一个sheet
      const first = sheets[0];
      return this.generateCsv(
        first,
        options.fileNamePrefix,
        timestamp,
        options.csvWithBom !== false,
      );
    }
    // 默认xlsx
    return this.generateXlsx(sheets, options.fileNamePrefix, timestamp);
  }

  /**
   * 导出单个工作表（便捷方法）
   */
  static exportSingleSheet<T>(
    sheet: SheetSpec<T>,
    options: ExportOptions,
  ): ExportFileResult {
    return this.exportSheets([sheet], options);
  }

  /**
   * 生成xlsx（支持多sheet）
   */
  private static generateXlsx<T>(
    sheets: readonly SheetSpec<T>[],
    fileNamePrefix: string,
    timestamp: string,
  ): ExportFileResult {
    const workbook = xlsx.utils.book_new();
    const usedNames = new Set<string>();

    sheets.forEach((sheet, index) => {
      const header = sheet.columns.map((c) => c.header);
      const dataRows = sheet.rows.map((row) =>
        sheet.columns.map((c) => this.getCellValue(c, row)),
      );

      const matrix = this.toSheetMatrix(header, dataRows);
      const worksheet = xlsx.utils.aoa_to_sheet(matrix);

      // 列宽设置（仅xlsx）
      if (sheet.columns.some((c) => typeof c.width === 'number')) {
        (worksheet as unknown as { '!cols'?: Array<{ wch?: number }> })[
          '!cols'
        ] = sheet.columns.map((c) => ({ wch: c.width }));
      }

      const rawName = sheet.name ?? `Sheet${index + 1}`;
      const safeName = this.getSafeUniqueSheetName(rawName, usedNames);
      xlsx.utils.book_append_sheet(workbook, worksheet, safeName);
      usedNames.add(safeName);
    });

    const buffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    const mime =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const fileName = `${fileNamePrefix}_${timestamp}.xlsx`;
    return { buffer, mime, fileName };
  }

  /**
   * 生成csv（仅单sheet，且只使用传入的第一个sheet）
   */
  private static generateCsv<T>(
    sheet: SheetSpec<T>,
    fileNamePrefix: string,
    timestamp: string,
    withBom: boolean,
  ): ExportFileResult {
    const header = sheet.columns.map((c) => c.header);
    const dataRows = sheet.rows.map((row) =>
      sheet.columns.map((c) => this.getCellValue(c, row)),
    );
    const matrix = this.toSheetMatrix(header, dataRows);
    const worksheet = xlsx.utils.aoa_to_sheet(matrix);
    const csvOutput = xlsx.utils.sheet_to_csv(worksheet);
    const bom = withBom ? Buffer.from([0xef, 0xbb, 0xbf]) : Buffer.alloc(0);
    const buffer = Buffer.concat([bom, Buffer.from(csvOutput)]);
    const mime = 'text/csv;charset=utf-8;';
    const fileName = `${fileNamePrefix}_${timestamp}.csv`;
    return { buffer, mime, fileName };
  }

  /**
   * 生成json（支持多sheet）
   */
  private static generateJson<T>(
    sheets: readonly SheetSpec<T>[],
    fileNamePrefix: string,
    timestamp: string,
    pretty: boolean,
  ): ExportFileResult {
    const obj: Record<string, Array<Record<string, CellValue>>> = {};
    const usedNames = new Set<string>();

    sheets.forEach((sheet, index) => {
      const safeName = this.getSafeUniqueSheetName(
        sheet.name ?? `Sheet${index + 1}`,
        usedNames,
      );
      const rows = sheet.rows.map((row) =>
        this.buildRowObject(sheet.columns, row),
      );
      obj[safeName] = rows;
      usedNames.add(safeName);
    });

    const json = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
    const buffer = Buffer.from(json);
    const mime = 'application/json';
    const fileName = `${fileNamePrefix}_${timestamp}.json`;
    return { buffer, mime, fileName };
  }

  /**
   * 将一行数据按列定义转换为对象（键为列头）
   */
  private static buildRowObject<T>(
    columns: readonly ColumnDef<T>[],
    row: T,
  ): Record<string, CellValue> {
    const record: Record<string, CellValue> = {};
    for (const col of columns) {
      record[col.header] = this.getCellValue(col, row);
    }
    return record;
  }

  /**
   * 安全获取单元格值：先accessor，再formatter，最终落到可导出的CellValue
   */
  private static getCellValue<T>(column: ColumnDef<T>, row: T): CellValue {
    const raw =
      typeof column.accessor === 'function'
        ? column.accessor(row)
        : (row as unknown as Record<string, unknown>)[String(column.accessor)];

    const formatted = column.formatter
      ? column.formatter(raw, row)
      : this.defaultFormat(raw);
    return formatted;
  }

  /**
   * 默认格式化：仅保留string/number类型，否则返回null
   */
  private static defaultFormat(value: unknown): CellValue {
    if (typeof value === 'string' || typeof value === 'number') return value;
    return null;
  }

  /**
   * 生成不重复且符合xlsx限制的sheet名称（<=31个字符，去除非法字符）
   */
  private static getSafeUniqueSheetName(
    rawName: string,
    used: Set<string>,
  ): string {
    const invalid = /[\\/?*[\]:]/g; // xlsx禁止字符

    const cleaned =
      rawName.replace(invalid, ' ').trim().slice(0, 31) || 'Sheet';
    if (!used.has(cleaned)) return cleaned;
    let i = 2;
    // 在不超过31长度的前提下追加编号
    while (true) {
      const suffix = ` (${i})`;
      const base = cleaned.slice(0, Math.max(0, 31 - suffix.length));
      const candidate = `${base}${suffix}`;
      if (!used.has(candidate)) return candidate;
      i += 1;
    }
  }

  /**
   * 将头部与数据行转为可被xlsx接收的矩阵（仅string/number/undefined）
   */
  private static toSheetMatrix(
    header: string[],
    dataRows: CellValue[][],
  ): Array<Array<string | number | undefined>> {
    const convert = (v: CellValue): string | number | undefined => {
      if (typeof v === 'string' || typeof v === 'number') return v;
      return undefined;
    };
    const rows = dataRows.map((r) => r.map(convert));
    return [header, ...rows];
  }
}

import * as xlsx from 'xlsx';
import { ExportFormat, SimpleCountryData } from '../../../types/dto';
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
 * 年份-国家ID对类型
 */
export type YearCountryPair = {
  year: number;
  countryIds: string[];
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
export type DataRowBuilder<T> = (
  country: SimpleCountryData,
  year: number,
  data: T,
) => ExportDataRow;

/**
 * 导出工具类
 * 提供通用的文件导出功能，支持 CSV、Excel、JSON 三种格式
 */
export class ExportUtils {
  /**
   * 生成导出文件（统一入口）
   * @param yearCountryPairs 年份-国家ID对数组
   * @param countryMap 国家映射
   * @param header 表头数组
   * @param dataRowBuilder 数据行构建函数
   * @param dataMap 数据映射 Map<year-countryId, T>
   * @param format 文件格式
   * @param fileNamePrefix 文件名前缀
   * @param logger 日志记录器（可选）
   * @returns 导出文件结果
   */
  static generateExportFile<T>(
    yearCountryPairs: YearCountryPair[],
    countryMap: Map<string, SimpleCountryData>,
    header: ExportHeader,
    dataRowBuilder: DataRowBuilder<T>,
    dataMap: Map<string, T>,
    format: ExportFormat,
    fileNamePrefix: string,
    logger?: {
      log: (message: string) => void;
      warn: (message: string) => void;
    },
  ): ExportFileResult {
    const timestamp = dayjs().format('YYYY_MM_DD_HH_mm_ss');

    if (format === ExportFormat.JSON) {
      return this._generateJsonFile(
        yearCountryPairs,
        countryMap,
        header,
        dataRowBuilder,
        dataMap,
        fileNamePrefix,
        timestamp,
      );
    } else if (format === ExportFormat.CSV) {
      return this._generateCsvFile(
        yearCountryPairs,
        countryMap,
        header,
        dataRowBuilder,
        dataMap,
        fileNamePrefix,
        timestamp,
        logger,
      );
    } else {
      return this._generateExcelFile(
        yearCountryPairs,
        countryMap,
        header,
        dataRowBuilder,
        dataMap,
        fileNamePrefix,
        timestamp,
      );
    }
  }

  /**
   * 生成JSON格式文件
   * @private
   */
  private static _generateJsonFile<T>(
    yearCountryPairs: YearCountryPair[],
    countryMap: Map<string, SimpleCountryData>,
    header: ExportHeader,
    dataRowBuilder: DataRowBuilder<T>,
    dataMap: Map<string, T>,
    fileNamePrefix: string,
    timestamp: string,
  ): ExportFileResult {
    const jsonData: { [key: string]: any[] } = {};

    yearCountryPairs.forEach(({ year, countryIds }) => {
      const yearData: any[] = [];

      countryIds.forEach((countryId) => {
        const country = countryMap.get(countryId);
        if (!country) return;

        const data = dataMap.get(`${year}-${countryId}`);
        const row = dataRowBuilder(country, year, data as T);

        // 将行数据转换为对象格式
        const rowObject: { [key: string]: any } = {};
        header.forEach((colName, index) => {
          rowObject[colName] = row[index] || null;
        });

        yearData.push(rowObject);
      });

      jsonData[`${year}年`] = yearData;
    });

    const buffer = Buffer.from(JSON.stringify(jsonData, null, 2));
    const mime = 'application/json';
    const fileName = `多年份${fileNamePrefix}_${timestamp}.json`;

    return { buffer, mime, fileName };
  }

  /**
   * 生成CSV格式文件
   * @private
   */
  private static _generateCsvFile<T>(
    yearCountryPairs: YearCountryPair[],
    countryMap: Map<string, SimpleCountryData>,
    header: ExportHeader,
    dataRowBuilder: DataRowBuilder<T>,
    dataMap: Map<string, T>,
    fileNamePrefix: string,
    timestamp: string,
    logger?: {
      log: (message: string) => void;
      warn: (message: string) => void;
    },
  ): ExportFileResult {
    // CSV格式只支持单年份，前端已做限制，正常情况下不会出现多个年份
    // 如果有多个年份，只导出第一个年份的数据
    if (yearCountryPairs.length > 1) {
      logger?.warn(
        '[警告] 多年份数据导出 - CSV格式不支持多年份，只导出第一个年份的数据',
      );
    }

    const { year, countryIds } = yearCountryPairs[0];
    const fileName = `${year}_${fileNamePrefix}_${timestamp}.csv`;

    // 构建数据行
    const dataRows: ExportDataRow[] = [];
    countryIds.forEach((countryId) => {
      const country = countryMap.get(countryId);
      if (!country) return;

      const data = dataMap.get(`${year}-${countryId}`);
      const row = dataRowBuilder(country, year, data as T);
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
  private static _generateExcelFile<T>(
    yearCountryPairs: YearCountryPair[],
    countryMap: Map<string, SimpleCountryData>,
    header: ExportHeader,
    dataRowBuilder: DataRowBuilder<T>,
    dataMap: Map<string, T>,
    fileNamePrefix: string,
    timestamp: string,
  ): ExportFileResult {
    const fileName = `${fileNamePrefix}_${timestamp}.xlsx`;

    // 创建新的工作簿
    const workbook = xlsx.utils.book_new();

    // 为每个年份创建工作表
    yearCountryPairs.forEach(({ year, countryIds }) => {
      // 构建数据行
      const dataRows: ExportDataRow[] = [];
      countryIds.forEach((countryId) => {
        const country = countryMap.get(countryId);
        if (!country) return;

        const data = dataMap.get(`${year}-${countryId}`);
        const row = dataRowBuilder(country, year, data as T);
        dataRows.push(row);
      });

      // 创建工作表
      const worksheet = xlsx.utils.aoa_to_sheet([header, ...dataRows]);
      const sheetName = `${year}年`;
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
   * 构建国家映射
   * @param countries 国家数组
   * @returns 国家映射 Map<countryId, SimpleCountryData>
   */
  static buildCountryMap(
    countries: SimpleCountryData[],
  ): Map<string, SimpleCountryData> {
    return new Map(countries.map((c) => [c.id, c]));
  }
}

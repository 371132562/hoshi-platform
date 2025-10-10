import {
  Body,
  Controller,
  Logger,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { DataManagementService } from './dataManagement.service';
import { Response } from 'express';
import {
  BatchCreateIndicatorValuesDto,
  BatchCheckIndicatorExistingDto,
  BatchCheckIndicatorExistingResDto,
  CountryDetailReqDto,
  CountryDetailResDto,
  CreateIndicatorValuesDto,
  CountryYearQueryDto,
  ExportDataMultiYearReqDto,
  DataManagementYearsResDto,
  DataManagementCountriesByYearsReqDto,
  DataManagementCountriesByYearsResDto,
  DataManagementListByYearReqDto,
  DataManagementListByYearResDto,
} from '../../../types/dto';

@Controller('dataManagement')
export class DataManagementController {
  private readonly logger = new Logger(DataManagementController.name);
  constructor(private readonly dataManagementService: DataManagementService) {}

  /**
   * 获取指定年份的数据管理条目（分页接口）
   */
  @Post('listByYear')
  async listByYear(
    @Body() params: DataManagementListByYearReqDto,
  ): Promise<DataManagementListByYearResDto> {
    return await this.dataManagementService.listByYear(params);
  }

  /**
   * 获取有数据的年份列表（用于导出页面优化）
   * @returns {Promise<DataManagementYearsResDto>} 年份数组
   */
  @Post('years')
  async getYears(): Promise<DataManagementYearsResDto> {
    return await this.dataManagementService.getYears();
  }

  /**
   * 根据多个年份获取该年份下的国家列表（用于导出页面优化）
   * @param params 包含年份数组的请求参数
   * @returns {Promise<DataManagementCountriesByYearsResDto>} 按年份分组的国家列表
   */
  @Post('countriesByYears')
  async getCountriesByYears(
    @Body() params: DataManagementCountriesByYearsReqDto,
  ): Promise<DataManagementCountriesByYearsResDto> {
    return await this.dataManagementService.getCountriesByYears(params);
  }

  /**
   * 创建或更新指标值数据
   * @param data 创建指标值的请求数据，包含国家ID、年份和指标值数组
   * @returns {Promise<{count: number}>} 创建或更新的指标值数量
   */
  @Post('create')
  async create(
    @Body() data: CreateIndicatorValuesDto,
  ): Promise<{ count: number }> {
    return this.dataManagementService.create(data);
  }

  /**
   * 批量创建或更新多个国家的指标值数据
   * @param data 批量创建指标值的请求数据，包含年份和多个国家的指标值数组
   * @returns {Promise<{totalCount: number, successCount: number, failCount: number, failedCountries: string[]}>} 批量创建的结果统计
   */
  @Post('batchCreate')
  async batchCreate(@Body() data: BatchCreateIndicatorValuesDto): Promise<{
    totalCount: number;
    successCount: number;
    failCount: number;
    failedCountries: string[];
  }> {
    return this.dataManagementService.batchCreate(data);
  }

  /**
   * 获取特定国家特定年份的详细指标数据
   * @param params 请求参数，包含国家ID和年份
   * @returns {Promise<CountryDetailResDto>} 国家详细指标数据
   */
  @Post('detail')
  async detail(
    @Body() params: CountryDetailReqDto,
  ): Promise<CountryDetailResDto> {
    return this.dataManagementService.detail(params);
  }

  @Post('delete')
  delete(@Body() params: CountryYearQueryDto) {
    return this.dataManagementService.delete(params);
  }

  @Post('checkExistingData')
  checkExistingData(@Body() params: CountryYearQueryDto) {
    return this.dataManagementService.checkExistingData(params);
  }

  /**
   * 批量检查多个国家和年份的指标数据是否存在
   */
  @Post('batchCheckExistingData')
  batchCheckExistingData(
    @Body() data: BatchCheckIndicatorExistingDto,
  ): Promise<BatchCheckIndicatorExistingResDto> {
    return this.dataManagementService.batchCheckExistingData(data);
  }

  /**
   * 导出多个年份和多个国家的数据
   * @param params 多年份导出参数，包含年份-国家ID对数组和格式
   * @param res Express响应对象，用于设置响应头和发送文件
   * @returns {Promise<StreamableFile>} 文件流
   */
  @Post('exportMultiYear')
  async exportDataMultiYear(
    @Body() params: ExportDataMultiYearReqDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log(
      `收到多年份导出请求, 年份数量: ${params.yearCountryPairs.length}, 格式: ${
        params.format
      }`,
    );
    const { buffer, mime, fileName } =
      await this.dataManagementService.exportDataMultiYear(params);

    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFileName}`,
    );

    return new StreamableFile(buffer);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UploadService } from '../../commonModules/upload/upload.service';
import { ImageProcessorUtils } from '../../common/upload';
import {
  BatchCreateScoreDto,
  BatchCheckScoreExistingDto,
  BatchCheckScoreExistingResDto,
  ScoreEvaluationItemDto,
  ScoreEvaluationResponseDto,
  CreateScoreDto,
  PaginatedYearScoreData,
  ScoreDataItem,
  ScoreDetailReqDto,
  ScoreDetailResponseDto,
  DeleteScoreDto,
  CheckExistingDataResDto,
  CountryScoreData,
  CountryScoreDataItem,
  ScoreListByYearReqDto,
  ScoreListByYearResDto,
  ScoreEvaluationDetailListItemDto,
  ScoreEvaluationDetailListByYearReqDto,
  ScoreEvaluationDetailListByYearResDto,
  ScoreEvaluationDetailGetReqDto,
  ScoreEvaluationDetailEditResDto,
  UpsertScoreEvaluationDetailDto,
  DataManagementCountriesByYearsReqDto,
  DataManagementCountriesByYearsResDto,
  ExportDataMultiYearReqDto,
  DeleteScoreEvaluationDetailDto,
  GetEvaluationTextReqDto,
  GetEvaluationTextResDto,
} from 'types/dto';
import { BusinessException } from '../../common/exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import { Score } from '@prisma/client';
import { decimalToNumber } from '../../common/utils/number.utils';
import { ConcurrencyService } from '../../commonModules/concurrency/concurrency.service';
import { ExportUtils } from '../../common/utils/export.utils';
import { SimpleCountryData } from 'types/dto';

/**
 * @class ScoreService
 * @description 封装与评分和评分评价相关的业务逻辑
 */
@Injectable()
export class ScoreService {
  private readonly logger = new Logger(ScoreService.name);
  constructor(
    private prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly concurrency: ConcurrencyService,
  ) {}

  /**
   * @description 获取所有有评分数据的年份列表
   * @returns {Promise<number[]>} 年份数组
   */
  async getYears(): Promise<number[]> {
    this.logger.log('[开始] 获取评分数据年份列表');

    try {
      const years = await this.prisma.score.findMany({
        where: {
          delete: 0,
          country: {
            delete: 0,
          },
        },
        select: {
          year: true,
        },
        distinct: ['year'],
        orderBy: {
          year: 'desc',
        },
      });

      this.logger.log(
        `[成功] 获取评分数据年份列表 - 共 ${years.length} 个年份`,
      );
      return years.map((item) => item.year);
    } catch (error) {
      this.logger.error(
        `[失败] 获取评分数据年份列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 获取所有评分数据，按国家分组
   */
  async listByCountry(): Promise<CountryScoreData[]> {
    this.logger.log('[开始] 获取评分数据并按国家分组');

    try {
      // 获取所有评分数据
      const scores = await this.prisma.score.findMany({
        where: {
          delete: 0,
          country: {
            delete: 0,
          },
        },
        include: {
          country: true,
        },
        orderBy: [{ country: { cnName: 'asc' } }, { year: 'desc' }],
      });

      if (!scores || scores.length === 0) {
        this.logger.log(
          '[成功] 获取评分数据并按国家分组 - 未找到任何数据，返回空数组',
        );
        return [];
      }

      // 按国家分组
      const countryMap = new Map<string, CountryScoreDataItem[]>();
      scores.forEach((score) => {
        const countryId = score.countryId;
        if (!countryMap.has(countryId)) {
          countryMap.set(countryId, []);
        }
        countryMap.get(countryId)!.push({
          year: score.year,
        });
      });

      // 转换为最终格式
      const result: CountryScoreData[] = Array.from(countryMap.entries()).map(
        ([countryId, scoreItems]) => {
          const country = scores.find(
            (s) => s.countryId === countryId,
          )!.country;
          return {
            countryId,
            cnName: country.cnName,
            enName: country.enName,
            data: scoreItems.sort((a, b) => b.year - a.year),
          };
        },
      );

      this.logger.log(
        `[成功] 获取评分数据并按国家分组 - 共 ${result.length} 个国家，总评分记录 ${scores.length} 条`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 获取评分数据并按国家分组 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 获取指定年份的评分数据（分页、排序、搜索）
   */
  async listByYear(
    params: ScoreListByYearReqDto,
  ): Promise<ScoreListByYearResDto> {
    const {
      year,
      page = 1,
      pageSize = 10,
      searchTerm,
      sortField,
      sortOrder,
    } = params;

    this.logger.log(
      `[开始] 获取年份评分数据 - 年份: ${year}, 页码: ${page}, 每页大小: ${pageSize}, 搜索: ${searchTerm || '无'}, 排序: ${sortField || '无'}`,
    );

    try {
      const skip = (page - 1) * pageSize;

      const whereCondition = {
        year,
        delete: 0,
        country: {
          delete: 0,
          ...(searchTerm && {
            OR: [
              { cnName: { contains: searchTerm } },
              { enName: { contains: searchTerm } },
            ],
          }),
        },
      } as const;

      const totalCount = await this.prisma.score
        .groupBy({
          by: ['countryId'],
          where: whereCondition,
          _count: { countryId: true },
        })
        .then((groups) => groups.length);

      let countryIdList: string[] = [];
      if (sortField && sortOrder) {
        const allScores = await this.prisma.score.findMany({
          where: whereCondition,
          include: { country: true },
        });

        const sortedScores = allScores.sort((a, b) => {
          let aValue: number | null = null;
          let bValue: number | null = null;
          switch (sortField) {
            case 'totalScore':
              aValue = decimalToNumber(a.totalScore);
              bValue = decimalToNumber(b.totalScore);
              break;
            case 'urbanizationProcessDimensionScore':
              aValue = decimalToNumber(a.urbanizationProcessDimensionScore);
              bValue = decimalToNumber(b.urbanizationProcessDimensionScore);
              break;
            case 'humanDynamicsDimensionScore':
              aValue = decimalToNumber(a.humanDynamicsDimensionScore);
              bValue = decimalToNumber(b.humanDynamicsDimensionScore);
              break;
            case 'materialDynamicsDimensionScore':
              aValue = decimalToNumber(a.materialDynamicsDimensionScore);
              bValue = decimalToNumber(b.materialDynamicsDimensionScore);
              break;
            case 'spatialDynamicsDimensionScore':
              aValue = decimalToNumber(a.spatialDynamicsDimensionScore);
              bValue = decimalToNumber(b.spatialDynamicsDimensionScore);
              break;
            default:
              return sortOrder === 'asc'
                ? a.country.updateTime.getTime() -
                    b.country.updateTime.getTime()
                : b.country.updateTime.getTime() -
                    a.country.updateTime.getTime();
          }
          if (aValue == null && bValue == null) return 0;
          if (aValue == null) return 1;
          if (bValue == null) return -1;
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });

        const uniqueCountryIds = [
          ...new Set(sortedScores.map((s) => s.countryId)),
        ];
        countryIdList = uniqueCountryIds.slice(skip, skip + pageSize);
      } else {
        const allCountryIds = await this.prisma.score.findMany({
          where: whereCondition,
          select: { countryId: true },
          orderBy: { country: { updateTime: 'desc' } },
        });
        const uniqueCountryIds = [
          ...new Set(
            allCountryIds.map((i: { countryId: string }) => i.countryId),
          ),
        ];
        countryIdList = uniqueCountryIds.slice(skip, skip + pageSize);
      }

      const scores = await this.prisma.score.findMany({
        where: {
          year,
          countryId: { in: countryIdList },
          delete: 0,
          country: { delete: 0 },
        },
        include: { country: true },
        orderBy: [{ country: { updateTime: 'desc' } }],
      });

      const data: ScoreDataItem[] = countryIdList
        .map((cid) => {
          const items = scores.filter((s) => s.countryId === cid);
          if (items.length === 0) return null;
          const base = items[0];
          return {
            id: base.id,
            countryId: base.countryId,
            cnName: base.country.cnName,
            enName: base.country.enName,
            year: base.year,
            totalScore: decimalToNumber(base.totalScore),
            urbanizationProcessDimensionScore: decimalToNumber(
              base.urbanizationProcessDimensionScore,
            ),
            humanDynamicsDimensionScore: decimalToNumber(
              base.humanDynamicsDimensionScore,
            ),
            materialDynamicsDimensionScore: decimalToNumber(
              base.materialDynamicsDimensionScore,
            ),
            spatialDynamicsDimensionScore: decimalToNumber(
              base.spatialDynamicsDimensionScore,
            ),
            createTime: base.country.createTime,
            updateTime: base.country.updateTime,
          } as ScoreDataItem;
        })
        .filter(Boolean) as ScoreDataItem[];

      const totalPages = Math.ceil(totalCount / pageSize);
      const pagination = { page, pageSize, total: totalCount, totalPages };

      const result: PaginatedYearScoreData = { year, data, pagination };

      this.logger.log(
        `[成功] 获取年份评分数据 - 年份: ${year}, 共 ${totalCount} 个国家，当前页返回 ${data.length} 个，页码: ${page}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 获取年份评分数据 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 评价详情（自定义文案）列表：
   * 仅返回综合分、评价规则匹配文案、是否存在自定义详情的标记。
   * 注意：与"评分详情（ScoreDetail）"不同；此处不返回四个维度得分，仅用于自定义评价详情管理列表。
   * 不需要排序，支持搜索与分页。分页逻辑基于唯一国家分页，与评分管理列表一致。
   */
  async listEvaluationDetailByYear(
    params: ScoreEvaluationDetailListByYearReqDto,
  ): Promise<ScoreEvaluationDetailListByYearResDto> {
    const { year, page = 1, pageSize = 10, searchTerm } = params;

    this.logger.log(
      `[开始] 获取评价详情列表 - 年份: ${year}, 页码: ${page}, 每页大小: ${pageSize}, 搜索: ${searchTerm || '无'}`,
    );

    try {
      const skip = (page - 1) * pageSize;

      const whereCondition = {
        year,
        delete: 0,
        country: {
          delete: 0,
          ...(searchTerm && {
            OR: [
              { cnName: { contains: searchTerm } },
              { enName: { contains: searchTerm } },
            ],
          }),
        },
      } as const;

      // 统计该年份国家数量（去重）
      const totalCount = await this.prisma.score
        .groupBy({
          by: ['countryId'],
          where: whereCondition,
          _count: { countryId: true },
        })
        .then((groups) => groups.length);

      // 取出去重后的国家ID并分页
      const allCountryIds = await this.prisma.score.findMany({
        where: whereCondition,
        select: { countryId: true },
        orderBy: { country: { updateTime: 'desc' } },
      });
      const uniqueCountryIds = [
        ...new Set(
          allCountryIds.map((i: { countryId: string }) => i.countryId),
        ),
      ];
      const countryIdList = uniqueCountryIds.slice(skip, skip + pageSize);

      // 查询分页后的评分记录
      const scores = await this.prisma.score.findMany({
        where: {
          year,
          countryId: { in: countryIdList },
          delete: 0,
          country: { delete: 0 },
        },
        include: { country: true },
        orderBy: [{ country: { updateTime: 'desc' } }],
      });

      // 查询自定义详情存在性
      const details = await this.prisma.scoreEvaluationDetail.findMany({
        where: { year, countryId: { in: countryIdList }, delete: 0 },
        select: { countryId: true },
      });
      const hasDetailSet = new Set(details.map((d) => d.countryId));

      // 读取评价体系规则，用于判断是否有匹配的文案
      const evaluations = await this.prisma.scoreEvaluation.findMany({
        orderBy: { minScore: 'asc' },
      });

      const hasMatchedText = (scoreNum: number): boolean => {
        for (const e of evaluations) {
          const min = decimalToNumber(e.minScore);
          const max = decimalToNumber(e.maxScore);
          if (scoreNum >= min && scoreNum < max) return true;
        }
        return false;
      };

      const data: ScoreEvaluationDetailListItemDto[] = countryIdList.reduce<
        ScoreEvaluationDetailListItemDto[]
      >((acc, cid) => {
        const item = scores.find((s) => s.countryId === cid);
        if (!item) return acc;
        const totalScore = decimalToNumber(item.totalScore);
        acc.push({
          id: item.id,
          countryId: item.countryId,
          cnName: item.country.cnName,
          enName: item.country.enName,
          year: item.year,
          totalScore,
          hasCustomDetail: hasDetailSet.has(item.countryId),
          hasMatchedText: hasMatchedText(totalScore),
          createTime: item.country.createTime,
          updateTime: item.country.updateTime,
        });
        return acc;
      }, []);

      const totalPages = Math.ceil(totalCount / pageSize);
      const pagination = { page, pageSize, total: totalCount, totalPages };

      const result = { year, data, pagination };

      this.logger.log(
        `[成功] 获取评价详情列表 - 年份: ${year}, 共 ${totalCount} 个国家，当前页返回 ${data.length} 个，页码: ${page}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 获取评价详情列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 获取评价详情（自定义文案）编辑数据
   */
  async getEvaluationDetail(
    params: ScoreEvaluationDetailGetReqDto,
  ): Promise<ScoreEvaluationDetailEditResDto | null> {
    const { year, countryId } = params;

    // 为日志补充国家名称
    const countryForLog = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
      select: { id: true, cnName: true, enName: true },
    });

    this.logger.log(
      countryForLog
        ? `[开始] 获取评价详情 - 年份: ${year}, 国家: ${countryForLog.cnName}(${countryForLog.enName}), 国家ID: ${countryForLog.id}`
        : `[开始] 获取评价详情 - 年份: ${year}, 国家ID: ${countryId}`,
    );

    try {
      const record = await this.prisma.scoreEvaluationDetail.findFirst({
        where: { year, countryId, delete: 0 },
      });

      if (!record) {
        this.logger.log(
          `[成功] 获取评价详情 - 年份: ${year}, 国家ID: ${countryId}, 未找到记录`,
        );
        return null;
      }

      const result = {
        id: record.id,
        year: record.year,
        countryId: record.countryId,
        text: (record as unknown as { text?: string }).text ?? '',
        images: (record.images as string[]) || [],
        createTime: record.createTime,
        updateTime: record.updateTime,
      };

      this.logger.log(
        countryForLog
          ? `[成功] 获取评价详情 - 年份: ${year}, 国家: ${countryForLog.cnName}(${countryForLog.enName}), 国家ID: ${countryForLog.id}, 记录ID: ${record.id}`
          : `[成功] 获取评价详情 - 年份: ${year}, 国家ID: ${countryId}, 记录ID: ${record.id}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 获取评价详情 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 获取评价文案（根据评分匹配评价体系规则）
   */
  async getEvaluationText(
    params: GetEvaluationTextReqDto,
  ): Promise<GetEvaluationTextResDto> {
    const { year, countryId } = params;

    // 为日志补充国家名称
    const countryForLog = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
      select: { id: true, cnName: true, enName: true },
    });

    this.logger.log(
      countryForLog
        ? `[开始] 获取评价文案 - 年份: ${year}, 国家: ${countryForLog.cnName}(${countryForLog.enName}), 国家ID: ${countryForLog.id}`
        : `[开始] 获取评价文案 - 年份: ${year}, 国家ID: ${countryId}`,
    );

    try {
      // 获取该国家该年份的评分
      const score = await this.prisma.score.findFirst({
        where: { year, countryId, delete: 0 },
        select: { totalScore: true },
      });

      if (!score) {
        this.logger.log(
          `[成功] 获取评价文案 - 年份: ${year}, 国家ID: ${countryId}, 未找到评分记录`,
        );
        return { matchedText: '' };
      }

      const totalScore = decimalToNumber(score.totalScore);

      // 读取评价体系规则，用于匹配文案
      const evaluations = await this.prisma.scoreEvaluation.findMany({
        orderBy: { minScore: 'asc' },
      });

      const matchText = (scoreNum: number): string => {
        for (const e of evaluations) {
          const min = decimalToNumber(e.minScore);
          const max = decimalToNumber(e.maxScore);
          if (scoreNum >= min && scoreNum < max) return e.evaluationText;
        }
        return '';
      };

      const matchedText = matchText(totalScore);

      this.logger.log(
        countryForLog
          ? `[成功] 获取评价文案 - 年份: ${year}, 国家: ${countryForLog.cnName}(${countryForLog.enName}), 国家ID: ${countryForLog.id}, 评分: ${totalScore}, 匹配文案长度: ${matchedText.length}`
          : `[成功] 获取评价文案 - 年份: ${year}, 国家ID: ${countryId}, 评分: ${totalScore}, 匹配文案长度: ${matchedText.length}`,
      );

      return { matchedText };
    } catch (error) {
      this.logger.error(
        `[失败] 获取评价文案 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 保存/更新评价详情（自定义文案）
   * - 纠正 images/deletedImages，避免误删
   * - 更新后异步清理删除的图片
   */
  async upsertEvaluationDetail(
    dto: UpsertScoreEvaluationDetailDto,
  ): Promise<ScoreEvaluationDetailEditResDto> {
    const { year, countryId, text } = dto;

    // 为日志补充国家名称
    const countryForLog = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
      select: { id: true, cnName: true, enName: true },
    });

    this.logger.log(
      countryForLog
        ? `[开始] 保存/更新评价详情 - 年份: ${year}, 国家: ${countryForLog.cnName}(${countryForLog.enName}), 国家ID: ${countryForLog.id}`
        : `[开始] 保存/更新评价详情 - 年份: ${year}, 国家ID: ${countryId}`,
    );

    try {
      const cleanedImages = ImageProcessorUtils.cleanImageFilenames(
        dto.images || [],
      );
      const cleanedDeleted = ImageProcessorUtils.cleanImageFilenames(
        dto.deletedImages || [],
      );

      const reconciled = ImageProcessorUtils.reconcileImages(
        cleanedImages,
        cleanedDeleted,
        text,
      );

      const saved = await this.concurrency.runExclusiveGlobal(async () => {
        const existing = await this.prisma.scoreEvaluationDetail.findFirst({
          where: { year, countryId, delete: 0 },
        });

        const dataToSave = {
          text,
          images: reconciled.images,
        } as const;

        return existing
          ? this.prisma.scoreEvaluationDetail.update({
              where: { id: existing.id },
              data: dataToSave,
            })
          : this.prisma.scoreEvaluationDetail.create({
              data: {
                year,
                country: { connect: { id: countryId } },
                ...dataToSave,
              },
            });
      });

      // 异步清理图片
      if (reconciled.deletedImages.length > 0) {
        this.logger.log(
          `[资源清理] 清理评价详情图片 - 待清理图片数量: ${reconciled.deletedImages.length}`,
        );
        ImageProcessorUtils.cleanupImagesAsync(
          this.uploadService,
          this.logger,
          reconciled.deletedImages,
          '评价详情更新，图片清理',
        );
      }

      const result = {
        id: saved.id,
        year: saved.year,
        countryId: saved.countryId,
        text: (saved as unknown as { text?: string }).text ?? '',
        images: (saved.images as string[]) || [],
        createTime: saved.createTime,
        updateTime: saved.updateTime,
      };

      this.logger.log(
        countryForLog
          ? `[成功] 保存/更新评价详情 - 年份: ${year}, 国家: ${countryForLog.cnName}(${countryForLog.enName}), 国家ID: ${countryForLog.id}, 记录ID: ${saved.id}`
          : `[成功] 保存/更新评价详情 - 年份: ${year}, 国家ID: ${countryId}, 记录ID: ${saved.id}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 保存/更新评价详情 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 删除评价详情（自定义文案）
   * - 物理删除评价详情记录
   * - 异步清理该评价详情关联的图片
   */
  async deleteEvaluationDetail(
    dto: DeleteScoreEvaluationDetailDto,
  ): Promise<void> {
    const { year, countryId } = dto;
    // 为日志补充国家名称
    const countryForLog = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
      select: { id: true, cnName: true, enName: true },
    });
    this.logger.log(
      countryForLog
        ? `[开始] 删除评价详情 - 年份: ${year}, 国家: ${countryForLog.cnName}(${countryForLog.enName}), 国家ID: ${countryForLog.id}`
        : `[开始] 删除评价详情 - 年份: ${year}, 国家ID: ${countryId}`,
    );

    try {
      // 1+2. 在同一互斥与事务内“查找并删除”，避免 TOCTOU
      const deletedDetail = await this.concurrency.runExclusiveGlobal(
        async () =>
          this.prisma.$transaction(async (tx) => {
            const toDelete = await tx.scoreEvaluationDetail.findFirst({
              where: { year, countryId, delete: 0 },
            });
            if (!toDelete) {
              return null;
            }
            return tx.scoreEvaluationDetail.delete({
              where: { id: toDelete.id },
            });
          }),
      );

      if (!deletedDetail) {
        this.logger.warn(
          `[验证失败] 删除评价详情 - 年份: ${year}, 国家ID: ${countryId} 不存在或已被删除`,
        );
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          `评价详情不存在或已被删除`,
        );
      }

      // 3. 异步清理该评价详情关联的图片
      ImageProcessorUtils.cleanupImagesAsync(
        this.uploadService,
        this.logger,
        deletedDetail.images as string[],
        '删除评价详情后的图片清理',
      );

      this.logger.log(
        countryForLog
          ? `[成功] 删除评价详情 - 年份: ${year}, 国家: ${countryForLog.cnName}(${countryForLog.enName}), 国家ID: ${countryForLog.id}`
          : `[成功] 删除评价详情 - 年份: ${year}, 国家ID: ${countryId}`,
      );
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 删除评价详情 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 创建或更新一个评分记录。如果给定国家和年份的记录已存在，则更新它；否则，创建新记录。
   * @param {CreateScoreDto} data - 创建或更新评分所需的数据。
   * @returns {Promise<Score>} 创建或更新后的评分记录。
   */
  async create(data: CreateScoreDto): Promise<Score> {
    // 1. 从 DTO 中解构所需参数
    const {
      countryId,
      year,
      totalScore,
      urbanizationProcessDimensionScore,
      humanDynamicsDimensionScore,
      materialDynamicsDimensionScore,
      spatialDynamicsDimensionScore,
    } = data;
    // 直接使用数字年份
    const yearValue = year;

    try {
      // 2. 验证关联的国家是否存在且未被删除
      const country = await this.prisma.country.findFirst({
        where: { id: countryId, delete: 0 },
      });
      if (!country) {
        this.logger.warn(
          `[验证失败] 创建评分记录 - 国家ID ${countryId} 不存在`,
        );
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          `未找到 ID 为 ${countryId} 的国家`,
        );
      }

      this.logger.log(
        `[开始] 创建评分记录 - 国家: ${country.cnName}(${country.enName}), 国家ID: ${country.id}, 年份: ${yearValue}`,
      );

      // 3. 检查该国家在该年份是否已存在评分记录
      const existingScore = await this.prisma.score.findFirst({
        where: {
          countryId,
          year: yearValue,
          delete: 0,
        },
      });

      // 4. 准备要写入数据库的评分数据
      const scoreData = {
        totalScore,
        urbanizationProcessDimensionScore,
        humanDynamicsDimensionScore,
        materialDynamicsDimensionScore,
        spatialDynamicsDimensionScore,
        year: yearValue,
      };

      // 5. 根据记录是否存在，执行更新或创建操作
      if (existingScore) {
        // 如果记录已存在，则更新现有记录
        this.logger.log(
          `[开始] 更新评分记录 - 国家: ${country.cnName}(${country.enName}), 国家ID: ${country.id}, 年份: ${yearValue}`,
        );
        const result = await this.concurrency.runExclusiveGlobal(async () =>
          this.prisma.score.update({
            where: { id: existingScore.id },
            data: scoreData,
          }),
        );
        this.logger.log(
          `[成功] 更新评分记录 - 国家: ${country.cnName}(${country.enName}), 国家ID: ${country.id}, 年份: ${yearValue}`,
        );
        return result;
      } else {
        // 如果记录不存在，则创建新记录
        this.logger.log(
          `[开始] 创建新评分记录 - 国家: ${country.cnName}(${country.enName}), 国家ID: ${country.id}, 年份: ${yearValue}`,
        );
        const result = await this.concurrency.runExclusiveGlobal(async () =>
          this.prisma.score.create({
            data: {
              ...scoreData,
              country: {
                connect: { id: countryId }, // 关联到国家
              },
            },
          }),
        );
        this.logger.log(
          `[成功] 创建新评分记录 - 国家: ${country.cnName}(${country.enName}), 国家ID: ${country.id}, 年份: ${yearValue}`,
        );
        return result;
      }
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 创建评分记录 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 批量创建或更新多个国家的评分记录。
   * @param {BatchCreateScoreDto} data - 包含年份和多个国家的评分数据。
   * @returns {Promise<{totalCount: number, successCount: number, failCount: number, failedCountries: string[]}>} 批量创建的结果统计。
   */
  async batchCreate(data: BatchCreateScoreDto): Promise<{
    totalCount: number;
    successCount: number;
    failCount: number;
    failedCountries: string[];
  }> {
    const { year, scores } = data;
    // 直接使用数字年份
    const yearValue = year;

    // 验证请求数据大小，防止过大的请求导致性能问题
    if (scores.length > 500) {
      this.logger.warn(
        `[警告] 批量创建评分记录 - 数据量过大: ${scores.length} 个国家，建议分批处理`,
      );
      throw new BusinessException(
        ErrorCode.INVALID_INPUT,
        `批量导入评分数据量过大，最多支持500个国家，当前为${scores.length}个。建议分批处理或减少数据量。`,
      );
    }

    this.logger.log(
      `[开始] 批量创建评分记录 - 年份: ${yearValue}, 国家数量: ${scores.length}`,
    );

    try {
      // 步骤1: 验证所有国家是否存在
      const countryIds = scores.map((s) => s.countryId);
      const existingCountries = await this.prisma.country.findMany({
        where: {
          id: { in: countryIds },
          delete: 0,
        },
      });

      const existingCountryIds = new Set(existingCountries.map((c) => c.id));
      const invalidCountryIds = countryIds.filter(
        (id) => !existingCountryIds.has(id),
      );

      if (invalidCountryIds.length > 0) {
        this.logger.error(
          `[验证失败] 批量创建评分记录 - 未找到以下国家ID: ${invalidCountryIds.join(', ')}`,
        );
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          `未找到以下国家ID: ${invalidCountryIds.join(', ')}`,
        );
      }

      // 步骤2: 检查哪些国家该年份已有数据
      const existingScores = await this.prisma.score.findMany({
        where: {
          countryId: { in: countryIds },
          year: yearValue,
          delete: 0,
        },
        select: {
          id: true,
          countryId: true,
        },
      });

      const existingScoreMap = new Map(
        existingScores.map((s) => [s.countryId, s.id]),
      );

      // 步骤3: 执行批量数据库操作
      const result = await this.concurrency.runExclusiveGlobal(async () =>
        this.prisma.$transaction(async (prisma) => {
          let totalCount = 0;

          // 处理每个国家的评分数据
          for (const scoreData of scores) {
            const { countryId, ...scoreFields } = scoreData;

            // 准备要写入数据库的评分数据
            const dataToSave = {
              ...scoreFields,
              year: yearValue,
            };

            // 检查是否已存在记录
            const existingScoreId = existingScoreMap.get(countryId);

            if (existingScoreId) {
              // 如果记录已存在，则更新现有记录
              await prisma.score.update({
                where: { id: existingScoreId },
                data: dataToSave,
              });
            } else {
              // 如果记录不存在，则创建新记录
              await prisma.score.create({
                data: {
                  ...dataToSave,
                  country: {
                    connect: { id: countryId },
                  },
                },
              });
            }
            totalCount++;
          }

          return { totalCount };
        }),
      );

      this.logger.log(
        `[成功] 批量创建评分记录 - 年份: ${yearValue}, 国家数量: ${scores.length}, 处理数量: ${result.totalCount}`,
      );

      return {
        totalCount: result.totalCount,
        successCount: scores.length,
        failCount: 0,
        failedCountries: [],
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 批量创建评分记录 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 获取特定国家和年份的评分详情。
   * @param {ScoreDetailReqDto} params - 包含 countryId 和 year。
   * @returns {Promise<ScoreDetailResponseDto>} 评分详情记录。
   */
  async detail(params: ScoreDetailReqDto): Promise<ScoreDetailResponseDto> {
    const { countryId, year } = params;
    const yearValue = year; // 直接使用数字年份

    // 为日志补充国家名称
    const countryForLog = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
      select: { id: true, cnName: true, enName: true },
    });

    this.logger.log(
      countryForLog
        ? `[开始] 获取评分详情 - 国家: ${countryForLog.cnName}(${countryForLog.enName}), 国家ID: ${countryForLog.id}, 年份: ${yearValue}`
        : `[开始] 获取评分详情 - 国家ID: ${countryId}, 年份: ${yearValue}`,
    );

    try {
      // 查询特定国家和年份的评分记录
      const score = await this.prisma.score.findFirst({
        where: {
          countryId,
          year: yearValue,
          delete: 0,
        },
        include: {
          country: true, // 同时返回关联的国家信息
        },
      });

      // 如果未找到记录，则抛出业务异常
      if (!score) {
        this.logger.warn(
          `[验证失败] 获取评分详情 - 国家ID ${countryId} 在 ${yearValue} 年的评分记录不存在`,
        );
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          `未找到国家 ID ${countryId} 在 ${year} 年的评分记录`,
        );
      }

      // 读取评价体系规则，用于匹配文案
      const evaluations = await this.prisma.scoreEvaluation.findMany({
        orderBy: { minScore: 'asc' },
      });

      const matchText = (scoreNum: number): string => {
        for (const e of evaluations) {
          const min = decimalToNumber(e.minScore);
          const max = decimalToNumber(e.maxScore);
          if (scoreNum >= min && scoreNum < max) return e.evaluationText;
        }
        return '';
      };

      const totalScore = decimalToNumber(score.totalScore);
      const matchedText = matchText(totalScore);

      // 将 Prisma Decimal 转换为 number 类型
      const result = {
        id: score.id,
        totalScore,
        urbanizationProcessDimensionScore: decimalToNumber(
          score.urbanizationProcessDimensionScore,
        ),
        humanDynamicsDimensionScore: decimalToNumber(
          score.humanDynamicsDimensionScore,
        ),
        materialDynamicsDimensionScore: decimalToNumber(
          score.materialDynamicsDimensionScore,
        ),
        spatialDynamicsDimensionScore: decimalToNumber(
          score.spatialDynamicsDimensionScore,
        ),
        year: score.year,
        countryId: score.countryId,
        country: {
          id: score.country.id,
          cnName: score.country.cnName,
          enName: score.country.enName,
          createTime: score.country.createTime,
          updateTime: score.country.updateTime,
        },
        matchedText,
        createTime: score.createTime,
        updateTime: score.updateTime,
      };

      this.logger.log(
        `[成功] 获取评分详情 - 国家: ${result.country.cnName}(${result.country.enName}), 国家ID: ${result.country.id}, 年份: ${yearValue}, 记录ID: ${score.id}`,
      );

      return result;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 获取评分详情 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 检查特定国家和年份的评分数据是否存在.
   * @param {ScoreDetailReqDto} params - 包含 countryId 和 year.
   * @returns {Promise<CheckExistingDataResDto>} 包含存在状态和计数的对象.
   */
  async checkExistingData(
    params: ScoreDetailReqDto,
  ): Promise<CheckExistingDataResDto> {
    const { countryId, year } = params;
    const yearValue = year; // 直接使用数字年份

    // 为日志补充国家名称
    const countryForLog = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
      select: { id: true, cnName: true, enName: true },
    });

    this.logger.log(
      countryForLog
        ? `[开始] 检查评分数据是否存在 - 国家: ${countryForLog.cnName}(${countryForLog.enName}), 国家ID: ${countryForLog.id}, 年份: ${yearValue}`
        : `[开始] 检查评分数据是否存在 - 国家ID: ${countryId}, 年份: ${yearValue}`,
    );

    try {
      const count = await this.prisma.score.count({
        where: {
          countryId,
          year: yearValue,
          delete: 0,
        },
      });

      const result = {
        exists: count > 0,
        count,
      };

      this.logger.log(
        countryForLog
          ? `[成功] 检查评分数据是否存在 - 国家: ${countryForLog.cnName}(${countryForLog.enName}), 国家ID: ${countryForLog.id}, 年份: ${yearValue}, 存在: ${result.exists}, 数量: ${count}`
          : `[成功] 检查评分数据是否存在 - 国家ID: ${countryId}, 年份: ${yearValue}, 存在: ${result.exists}, 数量: ${count}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 检查评分数据是否存在 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 批量检查多个国家和年份的评分数据是否存在.
   * @param {BatchCheckScoreExistingDto} data - 包含年份和国家ID数组.
   * @returns {Promise<BatchCheckScoreExistingResDto>} 批量检查结果，包含已存在和不存在的国家列表.
   */
  async batchCheckExistingData(
    data: BatchCheckScoreExistingDto,
  ): Promise<BatchCheckScoreExistingResDto> {
    const { year, countryIds } = data;
    const yearValue = year; // 直接使用数字年份

    this.logger.log(
      `[开始] 批量检查评分数据是否存在 - 年份: ${yearValue}, 国家数量: ${countryIds.length}`,
    );

    try {
      // 步骤1: 验证所有国家是否存在
      const existingCountries = await this.prisma.country.findMany({
        where: {
          id: { in: countryIds },
          delete: 0,
        },
      });

      const existingCountryIds = new Set(existingCountries.map((c) => c.id));
      const invalidCountryIds = countryIds.filter(
        (id) => !existingCountryIds.has(id),
      );

      if (invalidCountryIds.length > 0) {
        this.logger.warn(
          `[验证失败] 批量检查评分数据是否存在 - 未找到以下国家ID: ${invalidCountryIds.join(', ')}`,
        );
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          `未找到以下国家ID: ${invalidCountryIds.join(', ')}`,
        );
      }

      // 步骤2: 批量查询已存在的评分数据
      const existingScores = await this.prisma.score.findMany({
        where: {
          countryId: { in: countryIds },
          year: yearValue,
          delete: 0,
        },
        select: {
          countryId: true,
        },
      });

      const existingScoreCountryIds = new Set(
        existingScores.map((s) => s.countryId),
      );
      const nonExistingCountryIds = countryIds.filter(
        (id) => !existingScoreCountryIds.has(id),
      );

      const result = {
        totalCount: countryIds.length,
        existingCount: existingScoreCountryIds.size,
        existingCountries: Array.from(existingScoreCountryIds),
        nonExistingCountries: nonExistingCountryIds,
      };

      this.logger.log(
        `[成功] 批量检查评分数据是否存在 - 年份: ${yearValue}, 总国家数: ${result.totalCount}, 已有数据: ${result.existingCount}, 无数据: ${result.nonExistingCountries.length}`,
      );

      return result;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 批量检查评分数据是否存在 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 删除一个评分记录（物理删除）。
   * - 物理删除评分记录
   * - 连带删除相关的评分详情（自定义文案）
   * - 异步清理评分详情关联的图片
   * @param {DeleteScoreDto} params - 包含要删除的记录的 ID。
   * @returns {Promise<Score>} 已删除的评分记录。
   */
  async delete(params: DeleteScoreDto): Promise<Score> {
    const { id } = params;
    try {
      // 1. 查找要删除的评分记录，以获取其年份和国家ID
      const scoreToDelete = await this.prisma.score.findFirst({
        where: { id, delete: 0 },
        include: {
          country: { select: { id: true, cnName: true, enName: true } },
        },
      });

      if (!scoreToDelete) {
        this.logger.warn(
          `[验证失败] 删除评分记录 - 评分ID ${id} 不存在或已被删除`,
        );
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          `评分记录不存在或已被删除`,
        );
      }

      // 查询到记录后再输出更友好的开始日志
      this.logger.log(
        scoreToDelete.country
          ? `[开始] 删除评分记录 - 评分ID: ${id}, 年份: ${scoreToDelete.year}, 国家: ${scoreToDelete.country.cnName}(${scoreToDelete.country.enName}), 国家ID: ${scoreToDelete.countryId}`
          : `[开始] 删除评分记录 - 评分ID: ${id}, 年份: ${scoreToDelete.year}, 国家ID: ${scoreToDelete.countryId}`,
      );

      // 2+3. 在同一事务内删除相关的评分详情与评分记录（加全局写互斥）
      const { deletedScore, deletedDetailImages } =
        await this.concurrency.runExclusiveGlobal(async () =>
          this.prisma.$transaction(async (tx) => {
            const relatedDetail = await tx.scoreEvaluationDetail.findFirst({
              where: {
                year: scoreToDelete.year,
                countryId: scoreToDelete.countryId,
                delete: 0,
              },
            });

            let detailImages: string[] = [];
            if (relatedDetail) {
              const deletedDetail = await tx.scoreEvaluationDetail.delete({
                where: { id: relatedDetail.id },
              });
              detailImages = (deletedDetail.images as string[]) || [];
              this.logger.log(
                `[关联删除] 删除评分详情 - 年份: ${scoreToDelete.year}, 国家ID: ${scoreToDelete.countryId}`,
              );
            }

            const deleted = await tx.score.delete({ where: { id } });
            return { deletedScore: deleted, deletedDetailImages: detailImages };
          }),
        );

      // 4. 异步清理评分详情关联的图片（如果存在）
      if (deletedDetailImages.length > 0) {
        ImageProcessorUtils.cleanupImagesAsync(
          this.uploadService,
          this.logger,
          deletedDetailImages,
          '删除评分记录后的关联评分详情图片清理',
        );
      }

      this.logger.log(
        scoreToDelete.country
          ? `[成功] 删除评分记录 - 评分ID: ${id}, 年份: ${deletedScore.year}, 国家: ${scoreToDelete.country.cnName}(${scoreToDelete.country.enName}), 国家ID: ${deletedScore.countryId}`
          : `[成功] 删除评分记录 - 评分ID: ${id}, 年份: ${deletedScore.year}, 国家ID: ${deletedScore.countryId}`,
      );
      return deletedScore;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 删除评分记录 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 获取所有评分评价规则。
   * @returns {Promise<ScoreEvaluationResponseDto[]>} 按最小评分升序排列的评价规则列表。
   */
  async listEvaluation(): Promise<ScoreEvaluationResponseDto[]> {
    this.logger.log('[开始] 获取评分评价规则列表');

    try {
      const evaluations = await this.prisma.scoreEvaluation.findMany({
        orderBy: {
          minScore: 'asc', // 按最小评分升序排序
        },
      });

      // 将 Prisma Decimal 转换为 number 类型
      const result = evaluations.map((evaluation) => ({
        id: evaluation.id,
        minScore: decimalToNumber(evaluation.minScore),
        maxScore: decimalToNumber(evaluation.maxScore),
        evaluationText: evaluation.evaluationText,
        images: evaluation.images as string[],
        createTime: evaluation.createTime,
        updateTime: evaluation.updateTime,
      }));

      this.logger.log(
        `[成功] 获取评分评价规则列表 - 共 ${result.length} 条规则`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 获取评分评价规则列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 批量创建评分评价规则，此操作会先清空所有现有规则。
   * @param {ScoreEvaluationItemDto[]} data - 新的评分评价规则数组。
   * @returns {Promise<Prisma.BatchPayload>} 创建操作的结果。
   */
  async createEvaluation(data: ScoreEvaluationItemDto[]) {
    this.logger.log(`[开始] 批量创建评分评价规则 - 规则数量: ${data.length}`);

    try {
      // 1. 先收集现有评价规则的所有图片，避免产生孤立图片
      const existingEvaluations = await this.prisma.scoreEvaluation.findMany({
        select: { images: true },
      });

      // 收集所有现有图片
      const existingImages = existingEvaluations.flatMap(
        (evaluation) => (evaluation.images as string[]) || [],
      );

      this.logger.log(
        `[统计] 批量创建评分评价规则 - 现有规则数量: ${existingEvaluations.length}, 现有图片数量: ${existingImages.length}`,
      );

      // 2. 删除所有现有的评价规则（加全局写互斥）
      await this.concurrency.runExclusiveGlobal(() =>
        this.prisma.scoreEvaluation.deleteMany({}),
      );

      // 3. 使用工具类处理每个评价规则的图片数据
      const { processedData, allDeletedImages } =
        ImageProcessorUtils.processEvaluationImages(data);

      // 4. 收集新规则中使用的图片
      const newImages = processedData.flatMap(
        (item) => (item.images as string[]) || [],
      );

      // 5. 计算真正需要删除的图片：现有图片中不在新图片中的
      const imagesToDelete = existingImages.filter(
        (img) => !newImages.includes(img),
      );

      // 6. 合并需要删除的图片：孤立图片 + 新规则中标记删除的图片
      const allImagesToDelete = [...imagesToDelete, ...allDeletedImages];

      // 7. 批量创建新的评价规则
      const result = await this.concurrency.runExclusiveGlobal(() =>
        this.prisma.scoreEvaluation.createMany({
          data: processedData,
        }),
      );

      // 8. 异步清理不再使用的图片，不阻塞主流程
      if (allImagesToDelete.length > 0) {
        this.logger.log(
          `[资源清理] 清理评价规则图片 - 待清理图片数量: ${allImagesToDelete.length}`,
        );
        ImageProcessorUtils.cleanupImagesAsync(
          this.uploadService,
          this.logger,
          allImagesToDelete,
          '评价规则更新，图片清理',
        );
      }

      this.logger.log(
        `[成功] 批量创建评分评价规则 - 规则数量: ${data.length}, 创建成功: ${result.count}, 清理图片: ${allImagesToDelete.length}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 批量创建评分评价规则 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 根据多个年份获取该年份下存在评分数据的国家列表
   */
  async getCountriesByYears(
    params: DataManagementCountriesByYearsReqDto,
  ): Promise<DataManagementCountriesByYearsResDto> {
    this.logger.log(
      `[开始] 获取多个年份的国家列表 - 年份数量: ${params.years.length}`,
    );

    try {
      const result: DataManagementCountriesByYearsResDto = [];
      for (const year of params.years) {
        const countries = await this.prisma.score.findMany({
          where: {
            year,
            delete: 0,
            country: { delete: 0 },
          },
          select: {
            country: {
              select: { id: true, cnName: true, enName: true },
            },
          },
          distinct: ['countryId'],
          orderBy: { country: { cnName: 'asc' } },
        });
        result.push({
          year,
          countries: countries.map((c) => ({
            id: c.country.id,
            cnName: c.country.cnName,
            enName: c.country.enName,
          })),
        });
      }

      const totalCountries = result.reduce(
        (sum, item) => sum + item.countries.length,
        0,
      );
      this.logger.log(
        `[成功] 获取多个年份的国家列表 - 年份数量: ${params.years.length}, 总国家数: ${totalCountries}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 获取多个年份的国家列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 导出多个年份和多个国家的评分数据
   */
  async exportDataMultiYear(
    params: ExportDataMultiYearReqDto,
  ): Promise<{ buffer: Buffer; mime: string; fileName: string }> {
    const { yearCountryPairs, format } = params;

    this.logger.log(
      `[开始] 导出多年份评分数据 - 年份数量: ${yearCountryPairs.length}, 格式: ${format}`,
    );

    try {
      // 拿到涉及国家
      const allCountryIds = yearCountryPairs.flatMap((p) => p.countryIds);
      const uniqueCountryIds = [...new Set(allCountryIds)];
      const countries = await this.prisma.country.findMany({
        where: { id: { in: uniqueCountryIds }, delete: 0 },
      });
      const countryMap = ExportUtils.buildCountryMap(countries);

      // 取出对应年份国家的评分记录
      const orConds = yearCountryPairs.flatMap((p) =>
        p.countryIds.map((cid) => ({ year: p.year, countryId: cid })),
      );
      const scores = await this.prisma.score.findMany({
        where: { OR: orConds, delete: 0 },
      });
      // 按 key(year-countryId) 建索引
      const keyToScore = new Map<string, (typeof scores)[0]>();
      scores.forEach((s) => keyToScore.set(`${s.year}-${s.countryId}`, s));

      // 表头（统一）
      const header = [
        '国家',
        '综合评分',
        '城镇化进程',
        '人口迁徙动力',
        '经济发展动力',
        '空间发展动力',
      ];

      // 定义数据行构建函数
      const dataRowBuilder = (
        country: SimpleCountryData,
        year: number,
        score: (typeof scores)[0] | undefined,
      ) => {
        return [
          country.cnName,
          score ? decimalToNumber(score.totalScore) : null,
          score
            ? decimalToNumber(score.urbanizationProcessDimensionScore)
            : null,
          score ? decimalToNumber(score.humanDynamicsDimensionScore) : null,
          score ? decimalToNumber(score.materialDynamicsDimensionScore) : null,
          score ? decimalToNumber(score.spatialDynamicsDimensionScore) : null,
        ] as (string | number | null)[];
      };

      // 使用通用导出工具生成文件
      const result = ExportUtils.generateExportFile(
        yearCountryPairs,
        countryMap,
        header,
        dataRowBuilder,
        keyToScore,
        format,
        '评分数据',
        this.logger,
      );

      this.logger.log(
        `[成功] 导出多年份评分数据 - 年份数量: ${yearCountryPairs.length}, 格式: ${format}, 文件名: ${result.fileName}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 导出多年份评分数据 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}

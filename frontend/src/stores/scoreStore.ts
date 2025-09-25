import type {
  BatchCheckScoreExistingDto,
  BatchCheckScoreExistingResDto,
  BatchCreateScoreDto,
  CheckExistingDataResDto,
  CountryScoreData,
  CreateScoreDto,
  DataManagementCountriesByYearsReqDto,
  DataManagementCountriesByYearsResDto,
  DeleteScoreDto,
  DeleteScoreEvaluationDetailDto,
  ExportDataMultiYearReqDto,
  ExportFormat,
  GetEvaluationTextReqDto,
  GetEvaluationTextResDto,
  PaginatedYearScoreData,
  ScoreDetailReqDto,
  ScoreDetailResponseDto,
  ScoreEvaluationDetailEditResDto,
  ScoreEvaluationDetailGetReqDto,
  ScoreEvaluationDetailListByYearReqDto,
  ScoreEvaluationDetailListByYearResDto,
  ScoreEvaluationItemDto,
  ScoreEvaluationResponseDto,
  ScoreListByYearReqDto,
  ScoreListByYearResDto,
  UpsertScoreEvaluationDetailDto
} from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import * as apis from '@/services/apis'
import http from '@/services/base'
import { downloadFile } from '@/utils'

// 用于表单的临时状态，允许部分字段为空
type ScoreFormData = Partial<CreateScoreDto>

// 定义一个更完整的详情数据类型
type ScoreDetail = ScoreDetailResponseDto

interface ScoreStore {
  // 年份与按年数据缓存
  years: number[]
  yearsLoading: boolean
  yearDataMap: Record<number, PaginatedYearScoreData | undefined>
  yearLoadingMap: Record<number, boolean>
  yearQueryMap: Record<
    number,
    { page: number; pageSize: number; sortField?: string; sortOrder?: 'asc' | 'desc' }
  >
  globalSearchTerm: string

  // 按国家分组评分列表相关状态
  scoreListByCountry: CountryScoreData[]
  scoreListByCountryLoading: boolean

  // 评分详情相关状态
  detailData: ScoreDetail | ScoreFormData | null
  detailLoading: boolean

  // 评分评价相关状态
  evaluations: ScoreEvaluationResponseDto[]
  evaluationsLoading: boolean
  evaluationsSaveLoading: boolean

  // 通用操作状态
  saveLoading: boolean

  // 导出与多年份国家
  countriesByYears: DataManagementCountriesByYearsResDto
  countriesByYearsLoading: boolean
  exportLoading: boolean

  // 评价详情（自定义文案）列表状态
  customEvaluationDetailYearDataMap: Record<
    number,
    ScoreEvaluationDetailListByYearResDto | undefined
  >
  customEvaluationDetailYearLoadingMap: Record<number, boolean>
  customEvaluationDetailYearQueryMap: Record<number, { page: number; pageSize: number }>
  customEvaluationDetailSearchTerm: string
  // 评价详情编辑
  customEvaluationDetailEdit: ScoreEvaluationDetailEditResDto | null
  customEvaluationDetailEditLoading: boolean
  // 预览内容
  previewContent: string

  // 年份与按年列表
  getScoreYears: () => Promise<void>
  getScoreListByYear: (params: ScoreListByYearReqDto) => Promise<void>
  setGlobalSearchTerm: (term: string) => void

  // 多年份国家
  getScoreCountriesByYears: (params: DataManagementCountriesByYearsReqDto) => Promise<void>

  // 导出
  exportScoreMultiYear: (
    selectedCountryYearValues: string[],
    format: ExportFormat
  ) => Promise<boolean>

  // 按国家分组
  getScoreListByCountry: () => Promise<void>

  // 评分详情
  getScoreDetail: (params: ScoreDetailReqDto) => Promise<void>
  resetDetailData: () => void
  initializeNewData: () => void

  // 评价详情（自定义文案）列表
  setCustomEvaluationDetailSearchTerm: (term: string) => void
  getCustomEvaluationDetailListByYear: (
    params: ScoreEvaluationDetailListByYearReqDto
  ) => Promise<void>
  getCustomEvaluationDetail: (params: ScoreEvaluationDetailGetReqDto) => Promise<void>
  upsertCustomEvaluationDetail: (dto: UpsertScoreEvaluationDetailDto) => Promise<boolean>
  deleteCustomEvaluationDetail: (dto: DeleteScoreEvaluationDetailDto) => Promise<boolean>
  getEvaluationText: (params: GetEvaluationTextReqDto) => Promise<void>

  // 评分评价
  getEvaluations: () => Promise<void>
  saveEvaluations: (data: ScoreEvaluationItemDto[]) => Promise<boolean>

  // 评分数据操作
  createScore: (data: CreateScoreDto) => Promise<boolean>
  batchCreateScore: (data: BatchCreateScoreDto) => Promise<{
    totalCount: number
    successCount: number
    failCount: number
    failedCountries: string[]
  }>
  deleteData: (params: DeleteScoreDto) => Promise<boolean>

  // 评分数据检查
  checkScoreExistingData: (params: ScoreDetailReqDto) => Promise<CheckExistingDataResDto>
  batchCheckScoreExistingData: (
    data: BatchCheckScoreExistingDto
  ) => Promise<BatchCheckScoreExistingResDto>
}

const useScoreStore = create<ScoreStore>()(set => ({
  // 年份与按年数据缓存
  years: [],
  yearsLoading: false,
  yearDataMap: {},
  yearLoadingMap: {},
  yearQueryMap: {},
  globalSearchTerm: '',

  // 按国家分组
  scoreListByCountry: [],
  scoreListByCountryLoading: false,

  // 评分详情
  detailData: null,
  detailLoading: false,

  // 评分评价
  evaluations: [],
  evaluationsLoading: false,
  evaluationsSaveLoading: false,

  // 通用操作
  saveLoading: false,
  countriesByYears: [],
  countriesByYearsLoading: false,
  exportLoading: false,

  // 评价详情（自定义文案）列表状态
  customEvaluationDetailYearDataMap: {},
  customEvaluationDetailYearLoadingMap: {},
  customEvaluationDetailYearQueryMap: {},
  customEvaluationDetailSearchTerm: '',
  customEvaluationDetailEdit: null,
  customEvaluationDetailEditLoading: false,
  // 预览内容
  previewContent: '',

  // 年份列表
  getScoreYears: async () => {
    set({ yearsLoading: true })
    try {
      const res = await http.post<number[]>(apis.scoreYears, {})
      set({ years: res.data || [] })
    } catch (error) {
      console.error('获取评分年份失败:', error)
    } finally {
      set({ yearsLoading: false })
    }
  },

  // 单一年份列表
  getScoreListByYear: async (params: ScoreListByYearReqDto) => {
    const { year, page = 1, pageSize = 10, sortField, sortOrder } = params
    set(state => ({ yearLoadingMap: { ...state.yearLoadingMap, [year]: true } }))
    try {
      const res = await http.post<ScoreListByYearResDto>(apis.scoreListByYear, params)
      set(state => ({
        yearDataMap: { ...state.yearDataMap, [year]: res.data },
        yearQueryMap: {
          ...state.yearQueryMap,
          [year]: {
            page,
            pageSize,
            ...(sortField ? { sortField } : {}),
            ...(sortOrder ? { sortOrder } : {})
          }
        }
      }))
    } catch (error) {
      console.error('获取评分年份分页失败:', error)
    } finally {
      set(state => ({ yearLoadingMap: { ...state.yearLoadingMap, [year]: false } }))
    }
  },

  setGlobalSearchTerm: (term: string) => {
    set({ globalSearchTerm: term, yearDataMap: {}, yearQueryMap: {} })
  },

  // 获取多年份国家
  getScoreCountriesByYears: async (params: DataManagementCountriesByYearsReqDto) => {
    set({ countriesByYearsLoading: true })
    try {
      const res = await http.post<DataManagementCountriesByYearsResDto>(
        apis.scoreCountriesByYears,
        params
      )
      set({ countriesByYears: res.data })
    } catch (error) {
      console.error('获取评分多年份国家失败:', error)
    } finally {
      set({ countriesByYearsLoading: false })
    }
  },

  // 导出评分多年份
  exportScoreMultiYear: async (selectedCountryYearValues: string[], format: ExportFormat) => {
    set({ exportLoading: true })
    try {
      const yearMap = new Map<number, Set<string>>()
      selectedCountryYearValues.forEach(v => {
        const [countryId, yearStr] = v.split(':')
        const year = parseInt(yearStr)
        if (!yearMap.has(year)) yearMap.set(year, new Set())
        yearMap.get(year)!.add(countryId)
      })
      const yearCountryPairs: Array<{ year: number; countryIds: string[] }> = []
      yearMap.forEach((countryIds, year) => {
        yearCountryPairs.push({ year, countryIds: Array.from(countryIds) })
      })
      if (yearCountryPairs.length === 0) throw new Error('没有有效年份国家')

      const params: ExportDataMultiYearReqDto = { yearCountryPairs, format }
      const response = await http.post(apis.scoreExportMultiYear, params, { responseType: 'blob' })

      // 使用通用下载函数处理文件下载
      const downloadSuccess = downloadFile(response, '评分数据.xlsx')
      if (!downloadSuccess) {
        throw new Error('文件下载失败')
      }

      set({ exportLoading: false })
      return true
    } catch (e) {
      console.error('评分导出失败:', e)
      set({ exportLoading: false })
      return false
    }
  },

  // 按国家分组
  getScoreListByCountry: async () => {
    set({ scoreListByCountryLoading: true })
    try {
      const res = await http.post<CountryScoreData[]>(apis.scoreListByCountry, {})
      set({ scoreListByCountry: res.data || [], scoreListByCountryLoading: false })
    } catch (error) {
      console.log(error)
      set({ scoreListByCountryLoading: false, scoreListByCountry: [] })
    }
  },

  // ==================== 评分详情相关方法 ====================
  /**
   * 获取特定国家和年份的评分详情
   * @param params 包含countryId和year的参数
   */
  getScoreDetail: async (params: ScoreDetailReqDto) => {
    set({ detailLoading: true })
    try {
      const res = await http.post<ScoreDetail>(apis.scoreDetail, params)
      set({ detailData: res.data, detailLoading: false })
    } catch (error) {
      console.log(error)
      set({ detailLoading: false })
    }
  },

  /**
   * 重置评分详情数据
   */
  resetDetailData: () => {
    set({ detailData: null })
  },

  /**
   * 初始化新的评分数据表单
   */
  initializeNewData: () => {
    set({
      detailData: {
        countryId: undefined,
        year: undefined as number | undefined,
        totalScore: undefined,
        urbanizationProcessDimensionScore: undefined,
        humanDynamicsDimensionScore: undefined,
        materialDynamicsDimensionScore: undefined,
        spatialDynamicsDimensionScore: undefined
      }
    })
  },

  // ==================== 评价详情（自定义文案）列表 ====================
  setCustomEvaluationDetailSearchTerm: (term: string) => {
    set({
      customEvaluationDetailSearchTerm: term,
      customEvaluationDetailYearDataMap: {},
      customEvaluationDetailYearQueryMap: {}
    })
  },
  getCustomEvaluationDetailListByYear: async (params: ScoreEvaluationDetailListByYearReqDto) => {
    const { year, page = 1, pageSize = 10 } = params
    set(state => ({
      customEvaluationDetailYearLoadingMap: {
        ...state.customEvaluationDetailYearLoadingMap,
        [year]: true
      }
    }))
    try {
      const res = await http.post<ScoreEvaluationDetailListByYearResDto>(
        apis.scoreListEvaluationDetailByYear,
        params
      )
      set(state => ({
        customEvaluationDetailYearDataMap: {
          ...state.customEvaluationDetailYearDataMap,
          [year]: res.data
        },
        customEvaluationDetailYearQueryMap: {
          ...state.customEvaluationDetailYearQueryMap,
          [year]: { page, pageSize }
        }
      }))
    } catch (error) {
      console.error('获取评价详情（自定义文案）年份分页失败:', error)
      set(state => ({
        customEvaluationDetailYearDataMap: {
          ...state.customEvaluationDetailYearDataMap,
          [year]: undefined
        }
      }))
    } finally {
      set(state => ({
        customEvaluationDetailYearLoadingMap: {
          ...state.customEvaluationDetailYearLoadingMap,
          [year]: false
        }
      }))
    }
  },
  getCustomEvaluationDetail: async (params: ScoreEvaluationDetailGetReqDto) => {
    set({ customEvaluationDetailEditLoading: true })
    try {
      const res = await http.post<ScoreEvaluationDetailEditResDto | null>(
        apis.scoreEvaluationDetailGet,
        params
      )
      const detailData = res.data || null
      const text = detailData?.text || ''
      set({
        customEvaluationDetailEdit: detailData,
        customEvaluationDetailEditLoading: false,
        previewContent: text
      })
    } catch (error) {
      console.error('获取评价详情编辑数据失败:', error)
      set({
        customEvaluationDetailEditLoading: false,
        customEvaluationDetailEdit: null,
        previewContent: ''
      })
    }
  },
  upsertCustomEvaluationDetail: async (dto: UpsertScoreEvaluationDetailDto) => {
    try {
      await http.post(apis.scoreEvaluationDetailUpsert, dto)
      return true
    } catch (error) {
      console.error('保存评价详情失败:', error)
      return false
    }
  },
  deleteCustomEvaluationDetail: async (dto: DeleteScoreEvaluationDetailDto) => {
    try {
      await http.post(apis.scoreEvaluationDetailDelete, dto)
      return true
    } catch (error) {
      console.error('删除评价详情失败:', error)
      return false
    }
  },

  /**
   * 获取评价文案（根据评分匹配评价体系规则）
   */
  getEvaluationText: async (params: GetEvaluationTextReqDto) => {
    try {
      const res = await http.post<GetEvaluationTextResDto>(apis.scoreGetEvaluationText, params)
      const matchedText = res.data?.matchedText || ''
      set({ previewContent: matchedText })
    } catch (error) {
      console.error('获取评价文案失败:', error)
      set({ previewContent: '' })
    }
  },

  // ==================== 评分评价相关方法 ====================
  /**
   * 获取评分评价规则列表
   */
  getEvaluations: async () => {
    set({ evaluationsLoading: true })
    try {
      const res = await http.post<ScoreEvaluationResponseDto[]>(apis.scoreEvaluationList, {})
      set({ evaluations: res.data || [], evaluationsLoading: false })
    } catch (error) {
      console.log(error)
      set({ evaluationsLoading: false })
    }
  },

  /**
   * 保存评分评价规则
   * @param data 评价规则数组
   * @returns 保存是否成功
   */
  saveEvaluations: async (data: ScoreEvaluationItemDto[]) => {
    set({ evaluationsSaveLoading: true })
    try {
      await http.post(apis.scoreEvaluationCreate, data)
      set({ evaluationsSaveLoading: false })
      return true
    } catch (error) {
      console.log(error)
      set({ evaluationsSaveLoading: false })
      return false
    }
  },

  // ==================== 评分数据操作相关方法 ====================
  /**
   * 创建或更新单个评分记录
   * @param data 评分数据
   * @returns 操作是否成功
   */
  createScore: async (data: CreateScoreDto) => {
    set({ saveLoading: true })
    try {
      await http.post(apis.scoreCreate, data)
      set({ saveLoading: false })
      return true
    } catch (error) {
      console.log(error)
      set({ saveLoading: false })
      return false
    }
  },

  /**
   * 批量创建或更新多个国家的评分记录
   * @param data 批量评分数据
   * @returns 批量操作结果统计
   */
  batchCreateScore: async (data: BatchCreateScoreDto) => {
    set({ saveLoading: true })
    try {
      const response = await http.post(apis.scoreBatchCreate, data)
      set({ saveLoading: false })
      return response.data
    } catch (error) {
      console.log(error)
      set({ saveLoading: false })
      throw error
    }
  },

  /**
   * 删除评分记录
   * @param params 包含要删除记录ID的参数
   * @returns 删除是否成功
   */
  deleteData: async (params: DeleteScoreDto) => {
    try {
      await http.post(apis.scoreDelete, params)
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  },

  // ==================== 评分数据检查相关方法 ====================
  /**
   * 检查特定国家和年份的评分数据是否存在
   * @param params 包含countryId和year的参数
   * @returns 检查结果
   */
  checkScoreExistingData: async (params: ScoreDetailReqDto) => {
    try {
      const res = await http.post<CheckExistingDataResDto>(apis.scoreCheckExisting, params)
      return res.data
    } catch (error) {
      console.log(error)
      return { exists: false, count: 0 }
    }
  },

  /**
   * 批量检查多个国家和年份的评分数据是否存在
   * @param data 批量检查参数
   * @returns 批量检查结果
   */
  batchCheckScoreExistingData: async (data: BatchCheckScoreExistingDto) => {
    try {
      const res = await http.post<BatchCheckScoreExistingResDto>(apis.scoreBatchCheckExisting, data)
      return res.data
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}))

export default useScoreStore

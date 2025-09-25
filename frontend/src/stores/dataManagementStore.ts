import type {
  BatchCheckIndicatorExistingDto,
  BatchCheckIndicatorExistingResDto,
  BatchCreateIndicatorValuesDto,
  CheckExistingDataResDto,
  CountryDetailReqDto,
  CountryDetailResDto,
  CountryYearQueryDto,
  CreateIndicatorValuesDto,
  DataManagementCountriesByYearsReqDto,
  DataManagementCountriesByYearsResDto,
  DataManagementListByYearReqDto,
  DataManagementListByYearResDto,
  DataManagementYearsResDto,
  ExportDataMultiYearReqDto,
  PaginatedYearData,
  TopIndicatorItem
} from 'urbanization-backend/types/dto'
import { create } from 'zustand'

import {
  dataManagementBatchCheckExistingData,
  dataManagementBatchCreate,
  dataManagementCheckExistingData,
  dataManagementCountriesByYears,
  dataManagementCreate,
  dataManagementDelete,
  dataManagementDetail,
  dataManagementExportMultiYear,
  dataManagementListByYear,
  dataManagementYears
} from '@/services/apis'
import http from '@/services/base.ts'
import { ExportFormat } from '@/types'
import { downloadFile } from '@/utils'
import { dayjs } from '@/utils/dayjs'

type DataManagementStore = {
  // 新的按年份懒加载状态
  years: DataManagementYearsResDto
  yearsLoading: boolean
  yearDataMap: Record<number, PaginatedYearData | undefined>
  yearLoadingMap: Record<number, boolean>
  yearQueryMap: Record<
    number,
    { page: number; pageSize: number; sortField?: string; sortOrder?: 'asc' | 'desc' }
  >
  globalSearchTerm: string

  // 导出与详情等其它状态
  detailData: CountryDetailResDto | null
  detailLoading: boolean
  saveLoading: boolean
  exportLoading: boolean
  // 多年份国家数据
  countriesByYears: DataManagementCountriesByYearsResDto
  countriesByYearsLoading: boolean

  // 获取年份列表
  getDataManagementYears: () => Promise<void>
  // 获取单一年份数据（分页/排序）
  getDataManagementListByYear: (params: DataManagementListByYearReqDto) => Promise<void>
  // 设置全局搜索并清空已加载数据
  setGlobalSearchTerm: (term: string) => void

  // 其它既有能力
  getDataManagementCountriesByYears: (params: DataManagementCountriesByYearsReqDto) => Promise<void>
  getDataManagementDetail: (params: CountryDetailReqDto) => Promise<void>
  saveDataManagementDetail: (data: CreateIndicatorValuesDto) => Promise<boolean>
  batchSaveDataManagementDetail: (data: BatchCreateIndicatorValuesDto) => Promise<{
    totalCount: number
    successCount: number
    failCount: number
    failedCountries: string[]
  }>
  deleteData: (params: CountryYearQueryDto) => Promise<boolean>
  checkDataManagementExistingData: (params: CountryYearQueryDto) => Promise<CheckExistingDataResDto>
  batchCheckDataManagementExistingData: (
    data: BatchCheckIndicatorExistingDto
  ) => Promise<BatchCheckIndicatorExistingResDto>
  exportDataMultiYear: (
    selectedCountryYearValues: string[],
    format: ExportFormat
  ) => Promise<boolean>
  // 检查是否支持CSV格式（多年份时不支持）
  isCsvSupported: (selectedYears: number[]) => boolean
  resetDetailData: () => void
  initializeNewData: (indicatorHierarchy: TopIndicatorItem[]) => void
}

const useDataManagementStore = create<DataManagementStore>(set => ({
  // 懒加载所需的列表状态
  years: [],
  yearsLoading: false,
  yearDataMap: {},
  yearLoadingMap: {},
  yearQueryMap: {},
  globalSearchTerm: '',

  detailData: null,
  detailLoading: false,
  saveLoading: false,
  exportLoading: false,
  countriesByYears: [],
  countriesByYearsLoading: false,

  // 获取年份列表
  getDataManagementYears: async () => {
    set({ yearsLoading: true })
    try {
      const res = await http.post<DataManagementYearsResDto>(dataManagementYears, {})
      set({ years: res.data })
    } catch (error) {
      console.error('获取年份列表失败:', error)
    } finally {
      set({ yearsLoading: false })
    }
  },

  // 获取单一年份数据
  getDataManagementListByYear: async (params: DataManagementListByYearReqDto) => {
    const { year, page = 1, pageSize = 10, sortField, sortOrder } = params
    set(state => ({ yearLoadingMap: { ...state.yearLoadingMap, [year]: true } }))
    try {
      const res = await http.post<DataManagementListByYearResDto>(dataManagementListByYear, params)
      set(state => ({
        yearDataMap: { ...state.yearDataMap, [year]: res.data as PaginatedYearData },
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
      console.error('获取年份数据失败:', error)
    } finally {
      set(state => ({ yearLoadingMap: { ...state.yearLoadingMap, [year]: false } }))
    }
  },

  setGlobalSearchTerm: (term: string) => {
    set({ globalSearchTerm: term, yearDataMap: {}, yearQueryMap: {} })
  },

  // 获取多年份国家数据
  getDataManagementCountriesByYears: async (params: DataManagementCountriesByYearsReqDto) => {
    set({ countriesByYearsLoading: true })
    try {
      const res = await http.post(dataManagementCountriesByYears, params)
      set({ countriesByYears: res.data })
    } catch (error) {
      console.error('获取多年份国家列表失败:', error)
    } finally {
      set({ countriesByYearsLoading: false })
    }
  },

  // 获取特定国家和年份的详细指标数据
  getDataManagementDetail: async (params: CountryDetailReqDto) => {
    set({ detailLoading: true, detailData: null })
    try {
      const response = await http.post<CountryDetailResDto>(dataManagementDetail, params)
      set({ detailData: response.data, detailLoading: false })
    } catch (error) {
      console.error('Failed to fetch detail data:', error)
      set({ detailLoading: false })
    }
  },

  // 保存指标数据（新建或编辑）
  saveDataManagementDetail: async (data: CreateIndicatorValuesDto): Promise<boolean> => {
    set({ saveLoading: true })
    try {
      await http.post(dataManagementCreate, data)
      set({ saveLoading: false })
      return true
    } catch (error) {
      console.error('Failed to save data:', error)
      set({ saveLoading: false })
      return false
    }
  },

  // 批量保存指标数据（新建或编辑）
  batchSaveDataManagementDetail: async (data: BatchCreateIndicatorValuesDto) => {
    set({ saveLoading: true })
    try {
      const response = await http.post(dataManagementBatchCreate, data)
      set({ saveLoading: false })
      return response.data
    } catch (error) {
      console.error('Failed to batch save data:', error)
      set({ saveLoading: false })
      throw error
    }
  },

  // 删除特定国家和年份的数据
  deleteData: async (params: CountryYearQueryDto): Promise<boolean> => {
    try {
      await http.post(dataManagementDelete, params)
      return true
    } catch (error) {
      console.error('Failed to delete data:', error)
      return false
    }
  },

  // 检查特定国家和年份是否已有指标数据
  checkDataManagementExistingData: async (params: CountryYearQueryDto) => {
    try {
      const response = await http.post<CheckExistingDataResDto>(
        dataManagementCheckExistingData,
        params
      )
      return response.data
    } catch (error) {
      console.error('Failed to check existing data:', error)
      throw error
    }
  },

  // 批量检查多个国家和年份是否已有指标数据
  batchCheckDataManagementExistingData: async (data: BatchCheckIndicatorExistingDto) => {
    try {
      const response = await http.post<BatchCheckIndicatorExistingResDto>(
        dataManagementBatchCheckExistingData,
        data
      )
      return response.data
    } catch (error) {
      console.error('Failed to batch check existing data:', error)
      throw error
    }
  },

  // 多年份导出数据（包含数据组装逻辑）
  exportDataMultiYear: async (
    selectedCountryYearValues: string[],
    format: ExportFormat
  ): Promise<boolean> => {
    set({ exportLoading: true })
    try {
      // 解析选中的国家-年份值，格式：countryId:year
      const yearCountryPairs: Array<{ year: number; countryIds: string[] }> = []
      const yearMap = new Map<number, Set<string>>()

      selectedCountryYearValues.forEach(value => {
        const [countryId, yearStr] = value.split(':')
        const year = parseInt(yearStr)

        if (!yearMap.has(year)) {
          yearMap.set(year, new Set())
        }
        yearMap.get(year)!.add(countryId)
      })

      // 转换为后端需要的格式
      yearMap.forEach((countryIds, year) => {
        yearCountryPairs.push({
          year,
          countryIds: Array.from(countryIds)
        })
      })

      if (yearCountryPairs.length === 0) {
        throw new Error('没有找到有效的年份-国家组合数据')
      }

      const params: ExportDataMultiYearReqDto = {
        yearCountryPairs,
        format
      }

      const response = await http.post(dataManagementExportMultiYear, params, {
        responseType: 'blob' // 告诉axios期望接收二进制数据
      })

      // 使用通用下载函数处理文件下载
      const downloadSuccess = downloadFile(response, '多年份导出数据.xlsx')
      if (!downloadSuccess) {
        throw new Error('文件下载失败')
      }

      set({ exportLoading: false })
      return true
    } catch (error) {
      console.error('Failed to export multi-year data:', error)
      set({ exportLoading: false })
      return false
    }
  },

  // 检查是否支持CSV格式（多年份时不支持）
  isCsvSupported: (selectedYears: number[]) => {
    return selectedYears.length <= 1
  },

  // 重置详情数据
  resetDetailData: () => {
    set({ detailData: null })
  },

  // 为新建模式初始化 detailData
  initializeNewData: (indicatorHierarchy: TopIndicatorItem[]) => {
    // 深拷贝并转换指标层级，为每个三级指标添加 value 属性
    const initialIndicators = indicatorHierarchy.map(top => ({
      ...top,
      secondaryIndicators: top.secondaryIndicators.map(sec => ({
        ...sec,
        detailedIndicators: sec.detailedIndicators.map(det => ({
          ...det,
          value: null // 确保所有值都初始化为null
        }))
      }))
    }))

    // 为了渲染方便，将初始化的数据存入detailData
    set({
      detailData: {
        countryId: '',
        year: dayjs().year(), // 使用当前年份作为默认年份
        indicators: initialIndicators,
        isComplete: false
      }
    })
  }
}))

export default useDataManagementStore

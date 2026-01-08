import type {
  ArticleItemRes,
  ArticleListResDto,
  ArticleMetaItemRes,
  CreateArticleReq,
  DeleteArticleReq,
  UpdateArticleReq
} from 'template-backend/src/types/dto'
import { create } from 'zustand'

import {
  articleCreate,
  articleDelete,
  articleDetail,
  articleGetByPage,
  articleGetDetailsByIds,
  articleList,
  articleListAll,
  articleUpdate,
  articleUpsertOrder
} from '@/services/apis'
import http from '@/services/base'

// 文章列表查询参数类型（分页 + 搜索统一对象）
type ArticlePageParams = {
  page?: number
  pageSize?: number
  title?: string
}

type ArticleStore = {
  // 状态
  articles: ArticleMetaItemRes[]
  total: number
  articlePageParams: ArticlePageParams
  loading: boolean
  articleDetail: ArticleItemRes | null
  detailLoading: boolean
  submitLoading: boolean
  allArticles: ArticleMetaItemRes[]
  pageArticles: ArticleItemRes[]
  orderConfigLoading: boolean
  previewArticles: ArticleItemRes[]
  previewLoading: boolean

  // 操作
  fetchArticleList: (params?: Partial<ArticlePageParams>) => Promise<void>
  updateArticlePageParams: (params: Partial<ArticlePageParams>) => void
  resetArticleSearch: () => void
  createArticle: (data: CreateArticleReq) => Promise<boolean>
  updateArticle: (data: UpdateArticleReq) => Promise<boolean>
  deleteArticle: (data: DeleteArticleReq) => Promise<boolean>
  getArticleDetail: (id: string) => Promise<void>
  clearArticleDetail: () => void
  getAllArticles: () => Promise<void>
  getArticlesByPage: (page: string) => Promise<void>
  upsertArticleOrder: (page: string, articleIds: string[]) => Promise<boolean>
  getArticleDetailsByIds: (ids: string[]) => Promise<void>
}

const useArticleStore = create<ArticleStore>((set, get) => ({
  // 初始状态
  articles: [],
  total: 0,
  articlePageParams: { page: 1, pageSize: 10 },
  loading: false,
  articleDetail: null,
  detailLoading: false,
  submitLoading: false,
  allArticles: [],
  pageArticles: [],
  orderConfigLoading: false,
  previewArticles: [],
  previewLoading: false,

  // 获取文章列表（支持分页和筛选）
  fetchArticleList: async (params?: Partial<ArticlePageParams>) => {
    const merged = { ...get().articlePageParams, ...params }
    set({ loading: true, articlePageParams: merged })
    try {
      const response = await http.post<ArticleListResDto>(articleList, merged)
      if (response && response.data) {
        set({
          articles: response.data.list,
          total: response.data.total,
          articlePageParams: {
            ...merged,
            page: response.data.page,
            pageSize: response.data.pageSize
          }
        })
      }
    } catch (error) {
      console.error('获取文章列表失败:', error)
      set({ articles: [], total: 0 })
    } finally {
      set({ loading: false })
    }
  },

  // 更新分页/筛选参数并刷新列表（统一入口）
  updateArticlePageParams: (params: Partial<ArticlePageParams>) => {
    const merged = { ...get().articlePageParams, ...params }
    get().fetchArticleList(merged)
  },

  // 重置搜索条件
  resetArticleSearch: () => {
    get().updateArticlePageParams({ page: 1, title: undefined })
  },

  // 创建文章
  createArticle: async (data: CreateArticleReq) => {
    set({ submitLoading: true })
    try {
      await http.post(articleCreate, data)
      // 创建成功后回到第一页并清空搜索条件
      await get().fetchArticleList({ page: 1, title: undefined })
      return true
    } catch (error) {
      console.error('创建文章失败:', error)
      return false
    } finally {
      set({ submitLoading: false })
    }
  },

  // 更新文章
  updateArticle: async (data: UpdateArticleReq) => {
    set({ submitLoading: true })
    try {
      await http.post(articleUpdate, data)
      // 更新成功后刷新当前页
      await get().fetchArticleList()
      return true
    } catch (error) {
      console.error('更新文章失败:', error)
      return false
    } finally {
      set({ submitLoading: false })
    }
  },

  // 删除文章
  deleteArticle: async (data: DeleteArticleReq) => {
    try {
      await http.post(articleDelete, data)
      const { articles, articlePageParams } = get()
      const currentPage = articlePageParams.page || 1
      // 删除成功后，处理分页逻辑
      // 当删除的是当前页的最后一条数据时，需要返回上一页
      if (articles.length === 1 && currentPage > 1) {
        await get().fetchArticleList({ page: currentPage - 1 })
      } else {
        await get().fetchArticleList()
      }
      return true
    } catch (error) {
      console.error('删除文章失败:', error)
      return false
    }
  },

  // 获取文章详情
  getArticleDetail: async (id: string) => {
    set({ detailLoading: true, articleDetail: null })
    try {
      // 明确响应数据类型：文章详情
      const response = await http.post<ArticleItemRes>(articleDetail, { id })
      if (response && response.data) {
        set({ articleDetail: response.data })
      }
    } catch (error) {
      console.error('获取文章详情失败:', error)
      set({ articleDetail: null })
    } finally {
      set({ detailLoading: false })
    }
  },

  // 清除文章详情
  clearArticleDetail: () => {
    set({ articleDetail: null })
  },

  // 获取所有文章
  getAllArticles: async () => {
    set({ orderConfigLoading: true })
    try {
      // 明确响应数据类型：文章元数据列表
      const response = await http.post<ArticleMetaItemRes[]>(articleListAll)
      if (response && response.data) {
        set({ allArticles: response.data })
      }
    } catch (error) {
      console.error('获取所有文章列表失败:', error)
    } finally {
      set({ orderConfigLoading: false })
    }
  },

  // 根据页面获取文章
  getArticlesByPage: async (page: string) => {
    set({ orderConfigLoading: true })
    try {
      // 明确响应数据类型：页面文章列表
      const response = await http.post<ArticleItemRes[]>(articleGetByPage, { page })
      if (response && response.data) {
        set({ pageArticles: response.data })
      }
    } catch (error) {
      console.error(`获取页面 ${page} 文章失败:`, error)
      set({ pageArticles: [] })
    } finally {
      set({ orderConfigLoading: false })
    }
  },

  // 创建或更新文章顺序
  upsertArticleOrder: async (page: string, articles: string[]) => {
    set({ submitLoading: true })
    try {
      await http.post(articleUpsertOrder, { page, articles })
      return true
    } catch (error) {
      console.error('更新文章顺序失败:', error)
      return false
    } finally {
      set({ submitLoading: false })
    }
  },

  // 获取预览文章
  getArticleDetailsByIds: async (ids: string[]) => {
    set({ previewLoading: true, previewArticles: [] })
    try {
      const response = await http.post<ArticleItemRes[]>(articleGetDetailsByIds, {
        ids
      })
      if (response && response.data) {
        set({ previewArticles: response.data })
      }
    } catch (error) {
      console.error('获取预览文章失败:', error)
      set({ previewArticles: [] })
    } finally {
      set({ previewLoading: false })
    }
  }
}))

export default useArticleStore
